// customers.route.js
// Route for bot to order pizza

/* jshint esversion: 8 */

const message = require('../message');

const Steps = {
    INIT_STEP: 'initStep',
    TYPE_STEP: 'typeStep',
    TOPPINGS_STEP: 'toppingsStep',
    CONFIRM_TOPPINGS_STEP: 'confirmToppingsStep',
    ADDRESS_STEP: 'addressStep',
    SUMMARY_STEP: 'summaryStep'
};

async function orderPizza(payload, endpoint, customerCollection, response, context) {
    
    customer = await customerCollection.find({ userId: payload.user }).toArray();

    if (!customer[0]) {
        customerCollection.insertOne({ userId: payload.user, currStep: Steps.INIT_STEP });
        console.log("Inserting user ", payload.user);

        customer = await customerCollection.find({ userId: payload.user }).toArray();
    }
    //collection.updateOne({ userId: payload.user }, { $set: {currStep: Steps.INIT_STEP} });

    //console.log("currStep before anything else: ", customer[0].currStep);

    if (customer[0].currStep == Steps.TYPE_STEP) {
        if (!customer[0].typePizza) {
            await customerCollection.updateOne({ userId: payload.user }, { $set: { typePizza: payload.text } }); // NJC - use either await or callback to wait until complete
        }
    }
    if (customer[0].currStep == Steps.TOPPINGS_STEP) {
        await customerCollection.updateOne({ userId: payload.user }, { $addToSet: { toppings: payload.text } }); // NJC - use either await or callback to wait until complete

    }
    if (customer[0].currStep == Steps.CONFIRM_TOPPINGS_STEP) {
        if (payload.text == 'yes'){
            await customerCollection.updateOne({ userId: payload.user }, { $set: { currStep: Steps.TOPPINGS_STEP } });
        }
        else {
            await customerCollection.updateOne({ userId: payload.user }, { $set: { currStep: Steps.ADDRESS_STEP } });
        }
    }
    if (customer[0].currStep == Steps.ADDRESS_STEP) {
        if (!customer[0].address) {
            await customerCollection.updateOne({ userId: payload.user }, { $set: { address: payload.text } }); // NJC - use either await or callback to wait until complete
        }
    }

    customer = await customerCollection.find({ userId: payload.user }).toArray();

    // STEP CODE
    if (customer[0].currStep == Steps.INIT_STEP) {
        var args = payload.text.split(" ");

        args.forEach(async function (arg) {
            if (arg.includes("type:")) {
                var tempType = arg.replace('type:', '');
                await customerCollection.updateOne({ userId: payload.user }, { $set: { typePizza: tempType } }); // NJC - use either await or callback to wait until complete
            }
            else if (arg.includes("topping:")) {
                var tempTopping = arg.replace('topping:', '');
                await customerCollection.updateOne({ userId: payload.user }, { $addToSet: { toppings: tempTopping } }); // NJC - use either await or callback to wait until complete
            }
            else if (arg.includes("address:")) {
                var tempAddress = arg.replace('address:', '');
                await customerCollection.updateOne({ userId: payload.user }, { $set: { address: tempAddress } }); // NJC - use either await or callback to wait until complete
            }
        });
        await customerCollection.updateOne({ userId: payload.user }, { $set: { currStep: Steps.TYPE_STEP } }); // NJC - use either await or callback to wait until complete
    }

    customer = await customerCollection.find({ userId: payload.user }).toArray(); // NJC - use either await or callback to wait until complete

    if (customer[0].currStep == Steps.TYPE_STEP) {
        if (!customer[0].typePizza) {
            msg = message.createAndSend(endpoint, payload,
                "You didn't tell me what type of pizza you would like. What type of pizza would you like?", context);
            response.sendStatus(200);
        } else {
            await customerCollection.updateOne({ userId: payload.user }, { $set: { currStep: Steps.TOPPINGS_STEP } });
        }
    }

    customer = await customerCollection.find({ userId: payload.user }).toArray();

    if (customer[0].currStep == Steps.TOPPINGS_STEP) {
        if (!customer[0].toppings || payload.text == 'yes') {
            msg = message.createAndSend(endpoint, payload,
                "What toppings would you like?", context);
            response.sendStatus(200);
        } else {
            await customerCollection.updateOne({ userId: payload.user }, { $set: { currStep: Steps.CONFIRM_TOPPINGS_STEP } });
        }
    }

    customer = await customerCollection.find({ userId: payload.user }).toArray();

    if (customer[0].currStep == Steps.CONFIRM_TOPPINGS_STEP) {
        msg = message.createAndSend(endpoint, payload,
            "Would you like any more toppings?", context);
        response.sendStatus(200);
    }

    customer = await customerCollection.find({ userId: payload.user }).toArray();

    if (customer[0].currStep == Steps.ADDRESS_STEP) {
        if (!customer[0].address) {
            msg = message.createAndSend(endpoint, payload,
                "You didn't tell me your address. What is your address?", context);
            response.sendStatus(200);
        } else {
            await customerCollection.updateOne({ userId: payload.user }, { $set: { currStep: Steps.SUMMARY_STEP } });
        }
    }

    customer = await customerCollection.find({ userId: payload.user }).toArray();

    if (customer[0].currStep == Steps.SUMMARY_STEP) {
        msg = message.createAndSend(endpoint, payload,
              "Your order of a " + customer[0].typePizza + " pizza with " + customer[0].toppings + " will be delivered to " + customer[0].address, context);
        response.sendStatus(200);

        await customerCollection.updateMany({ userId: payload.user }, { $unset: { typePizza: "", toppings: "", address: "" } });
        await customerCollection.updateOne({ userId: payload.user }, { $set: { currStep: Steps.INIT_STEP } });
    }
}

module.exports = {
    orderPizza
};