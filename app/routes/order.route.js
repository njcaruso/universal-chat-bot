// order.route.js
// Test route for order rules

/* jshint esversion: 8 */

const FILE_NAME = __filename + ": ";

const message = require("../message");
const rules = require('../lib/order-rules.json');

/*
1. Get mongo user
    a. Check if user exists, if not create user
2. Loop through order rules for each step
    a. Check if step is required
        i. If required, send question
    b. Check if multivalue question
        i. If multivalue, loop until max amount or user asks to stop 
*/

async function orderPizza(payload, endpoint, collection, res, context) {

    // Check is user exists
    customer = await collection.find({ userId: payload.user }).toArray();

    if (!customer[0]) {
        collection.insertOne({ userId: payload.user, currStep: "initStep", numStep: 0 });
        //collection.insertOne({ userId: payload.user, numStep: 0 });
        console.log(FILE_NAME + "Inserting user " + payload.user);

        customer = await collection.find({ userId: payload.user }).toArray();
    }

    // Parse what the user just said before continuing
    var updateNum = (customer[0].numStep - 1 < 0) ? 0 : customer[0].numStep - 1;
    var name = rules[updateNum].dataElement;
    var currRule = rules[updateNum];

    // TODO: MULTIVALUE NEEDS TO HANDLE THE GO BACK PART
    if (currRule.required && currRule.dataType != null) {
        await collection.updateOne({ userId: payload.user },{ $set: { [name]: payload.text } });
    } else if (currRule.multiValue && currRule.dataType != null) {
        await collection.updateOne({ userId: payload.user },{ $addToSet: { [name]: payload.text } });
    }

    customer = await collection.find({ userId: payload.user }).toArray();

    //TODO: MULTIVALUE HANDLE MORE VALUES
    var updateNumFlag = true;
    var index = customer[0].numStep;
    if (rules[index].required) {
        message.createAndSend(endpoint, payload, rules[index].question, context);
        res.sendStatus(200);
    } else if (rules[index].multiValue) {
        if (payload.text == 'yes') {
            message.createAndSend(endpoint, payload, rules[index].multiValueQuestion, context);
            updateNumFlag = false;
        } else {
            message.createAndSend(endpoint, payload, rules[index].question, context);
        }
    }

    if (updateNumFlag) updateNum = customer[0].numStep + 1;
    else updateNum = customer[0].numStep;

    await collection.updateOne({ userId: payload.user }, { $set: { numStep: updateNum } });

    if (rules[index].dataElement == "summary") {
        msg = "Your order of a " + customer[0].size + " pizza with " + customer[0].toppings + " will be delivered to " + customer[0].address;
        message.createAndSend(endpoint, payload, msg, context);
        await collection.updateMany({ userId: payload.user }, { $unset: { size: "", toppings: "", address: "" } });
        await collection.updateOne({ userId: payload.user }, { $set: { numStep: 0 } });
    }
}

module.exports = {
    orderPizza
};

