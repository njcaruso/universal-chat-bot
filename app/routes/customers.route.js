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

async function orderPizza(payload, endpoint, customerCollection, response) {
    
    customer = await customerCollection.find({ userId: payload.event.user }).toArray();

    if (!customer[0]) {
        customerCollection.insertOne({ userId: payload.event.user, currStep: Steps.INIT_STEP });
        console.log("Inserting user ", payload.event.user);

        customer = await customerCollection.find({ userId: payload.event.user }).toArray();
    }
    //collection.updateOne({ userId: payload.event.user }, { $set: {currStep: Steps.INIT_STEP} });

    //console.log("currStep before anything else: ", customer[0].currStep);

    if (customer[0].currStep == Steps.TYPE_STEP) {
        if (!customer[0].typePizza) {
            await customerCollection.updateOne({ userId: payload.event.user }, { $set: { typePizza: payload.event.text } }); // NJC - use either await or callback to wait until complete
        }
    }
    if (customer[0].currStep == Steps.TOPPINGS_STEP) {
        await customerCollection.updateOne({ userId: payload.event.user }, { $addToSet: { toppings: payload.event.text } }); // NJC - use either await or callback to wait until complete

    }
    if (customer[0].currStep == Steps.CONFIRM_TOPPINGS_STEP) {
        if (payload.event.text == 'yes'){
            await customerCollection.updateOne({ userId: payload.event.user }, { $set: { currStep: Steps.TOPPINGS_STEP } });
        }
        else {
            await customerCollection.updateOne({ userId: payload.event.user }, { $set: { currStep: Steps.ADDRESS_STEP } });
        }
    }
    if (customer[0].currStep == Steps.ADDRESS_STEP) {
        if (!customer[0].address) {
            await customerCollection.updateOne({ userId: payload.event.user }, { $set: { address: payload.event.text } }); // NJC - use either await or callback to wait until complete
        }
    }

    customer = await customerCollection.find({ userId: payload.event.user }).toArray();

    // STEP CODE
    if (customer[0].currStep == Steps.INIT_STEP) {
        var args = payload.event.text.split(" ");

        args.forEach(async function (arg) {
            if (arg.includes("type:")) {
                var tempType = arg.replace('type:', '');
                await customerCollection.updateOne({ userId: payload.event.user }, { $set: { typePizza: tempType } }); // NJC - use either await or callback to wait until complete
            }
            else if (arg.includes("topping:")) {
                var tempTopping = arg.replace('topping:', '');
                await customerCollection.updateOne({ userId: payload.event.user }, { $addToSet: { toppings: tempTopping } }); // NJC - use either await or callback to wait until complete
            }
            else if (arg.includes("address:")) {
                var tempAddress = arg.replace('address:', '');
                await customerCollection.updateOne({ userId: payload.event.user }, { $set: { address: tempAddress } }); // NJC - use either await or callback to wait until complete
            }
        });
        await customerCollection.updateOne({ userId: payload.event.user }, { $set: { currStep: Steps.TYPE_STEP } }); // NJC - use either await or callback to wait until complete
    }

    customer = await customerCollection.find({ userId: payload.event.user }).toArray(); // NJC - use either await or callback to wait until complete

    if (customer[0].currStep == Steps.TYPE_STEP) {
        if (!customer[0].typePizza) {
            msg = message.createAndSend(payload.event,
                "You didn't tell me what type of pizza you would like. What type of pizza would you like?");
            response.sendStatus(200);
        } else {
            await customerCollection.updateOne({ userId: payload.event.user }, { $set: { currStep: Steps.TOPPINGS_STEP } });
        }
    }

    customer = await customerCollection.find({ userId: payload.event.user }).toArray();

    if (customer[0].currStep == Steps.TOPPINGS_STEP) {
        if (!customer[0].toppings || payload.event.text == 'yes') {
            msg = message.createAndSend(payload.event,
                "What toppings would you like?");
            response.sendStatus(200);
        } else {
            await customerCollection.updateOne({ userId: payload.event.user }, { $set: { currStep: Steps.CONFIRM_TOPPINGS_STEP } });
        }
    }

    customer = await customerCollection.find({ userId: payload.event.user }).toArray();

    if (customer[0].currStep == Steps.CONFIRM_TOPPINGS_STEP) {
        msg = message.createAndSend(payload.event,
            "Would you like any more toppings?");
        response.sendStatus(200);
    }

    customer = await customerCollection.find({ userId: payload.event.user }).toArray();

    if (customer[0].currStep == Steps.ADDRESS_STEP) {
        if (!customer[0].address) {
            msg = message.createAndSend(payload.event,
                "You didn't tell me your address. What is your address?");
            response.sendStatus(200);
        } else {
            await customerCollection.updateOne({ userId: payload.event.user }, { $set: { currStep: Steps.SUMMARY_STEP } });
        }
    }

    customer = await customerCollection.find({ userId: payload.event.user }).toArray();

    if (customer[0].currStep == Steps.SUMMARY_STEP) {
        msg = message.createAndSend(payload.event,
              "Your order of a " + customer[0].typePizza + " pizza with " + customer[0].toppings + " will be delivered to " + customer[0].address);
        response.sendStatus(200);

        await customerCollection.updateMany({ userId: payload.event.user }, { $unset: { typePizza: "", toppings: "", address: "" } });
        await customerCollection.updateOne({ userId: payload.event.user }, { $set: { currStep: Steps.INIT_STEP } });
    }
}

module.exports = {
    orderPizza
};