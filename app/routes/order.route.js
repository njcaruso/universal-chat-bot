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

    var updateObject = await parseQuery(payload.text);
    console.log("Object: ", updateObject);
    
    var customer = await collection.find({ userId: payload.user }).toArray();

    if (!customer[0]) {
        customer = await collection.insertOne({ userId: payload.user, numStep: 0 });
        customer = customer.ops;
    }

    var index = customer[0].numStep;
    var prevIndex = index - 1;
    var nextIndex = index + 1;

    // Update for the first question
    if (prevIndex === 0) {
        if (updateObject.toppings) {
            await collection.updateOne({userId: payload.user}, { 
                $set: {
                    size: updateObject.sizePizza,
                    address: updateObject.address
                }, $addToSet: {
                    toppings: updateObject.toppings
                }
            });
        } else {
            await collection.updateOne({userId: payload.user}, { 
                $set: {
                    size: updateObject.sizePizza,
                    address: updateObject.address
                }
            }); 
        }
    // Now update for any other question only if "field" isnt empty
    } else if (updateObject.field !== '') {
        if (rules[prevIndex].dataType !== "string[]" && rules[index].dataType !== null) {
            await collection.updateOne({userId: payload.user}, {
                $set: {
                    [rules[prevIndex].dataElement]: updateObject.field
                }
            });
        }
        else if (rules[prevIndex].dataType !== null) {
            await collection.updateOne({userId: payload.user}, {
                $addToSet: {
                    [rules[prevIndex].dataElement]: updateObject.field
                }
            });
        }
    }

    console.log("Customer", customer);
    console.log("Text coming in: ", payload.text);
    console.log("Toppings List: ", customer[0].toppings);
    if (prevIndex >= 0) {
        if (rules[prevIndex].multiValue) {
            if (payload.text === 'yes') {
                console.log("hereeeeeeeeeee", rules[index].question);
                message.createAndSend(endpoint, payload, rules[prevIndex - 1].question, context);
                res.sendStatus(200);

                nextIndex = prevIndex - 1;
            } else {
                console.log("not hereeeee");
                message.createAndSend(endpoint, payload, rules[index].question, context);
                res.sendStatus(200);
            }
        } else if (rules[prevIndex].required) {
            message.createAndSend(endpoint, payload, rules[index].question, context);
            res.sendStatus(200);
        }
    } else {
        message.createAndSend(endpoint, payload, rules[index].question, context);
    }
    

    //message.createAndSend(endpoint, payload, rules[index].question, context);


    await collection.updateOne({ userId: payload.user }, { $set: { numStep: nextIndex} });
    


}



// async function orderPizza(payload, endpoint, collection, res, context) {

//     console.log(customer[0]);

//     var cachedIndex = (customer[0].numStep) ? customer[0].numStep : -1;
//     var updateNumFlag = false;

//     console.log("Cached index: ", cachedIndex);

//     var updateObject;

//     if (!customer || cachedIndex === 0) {
//         updateObject = await parseQuery(payload.text.split(" "));

//         await collection.updateOne({userId: payload.user}, { 
//             $set: {
//                 size: updateObject.sizePizza,
//                 address: updateObject.address
//             }, $addToSet: {
//                 toppings: updateObject.toppings
//             }
//         });
//         updateNumFlag = true;
//         console.log("updateNumFlag", updateNumFlag);
//     }

//     console.log("updateObject", updateObject);


//     // Parse what the user just said before continuing
//     var name = rules[cachedIndex].dataElement;
//     var currRule = rules[cachedIndex];

//     //TODO: MULTIVALUE NEEDS TO HANDLE THE GO BACK PART
//     if (currRule.required && currRule.dataType != null) {
//         await collection.updateOne({ userId: payload.user },{ $set: { [name]: payload.text } });
//     } else if (currRule.multiValue && currRule.dataType === 'string[]') {
//         await collection.updateOne({ userId: payload.user },{ $addToSet: { [name]: payload.text } });
//     }
    
//     // Check is user exists
//     customer = await collection.find({ userId: payload.user }).toArray();

//     if (!customer[0]) {
//         await collection.insertOne({ userId: payload.user, numStep: 0 });
//         //collection.insertOne({ userId: payload.user, numStep: 0 });
//         console.log(FILE_NAME + "Inserting user " + payload.user);

//         customer = await collection.find({ userId: payload.user }).toArray();
//     }

//     //TODO: MULTIVALUE HANDLE MORE VALUES
//     if (rules[cachedIndex].required) {
//         message.createAndSend(endpoint, payload, rules[cachedIndex].question, context);
//         res.sendStatus(200);
//         updateNumFlag = true;
//     } else if (rules[cachedIndex].multiValue) {   
//         // If toppings exist, send multivalue question    
//         if (customer[0].toppings[0]) {
//             if (customer[0].toppings.length === 2 || payload.text === 'no') {
//                 updateNumFlag = true;
//             } else {
//                 message.createAndSend(endpoint, payload, rules[cachedIndex].multiValueQuestion, context);
//             }
            
//         }
//         // If they dont exist, we want to send regular question
//         else {
//             message.createAndSend(endpoint, payload, rules[cachedIndex].question, context);
//             updateNumFlag = true;
//         }
//     }

//     var updateNum = (updateNumFlag) ? customer[0].numStep + 1 : customer[0].numStep;

//     await collection.updateOne({ userId: payload.user }, { $set: { numStep: updateNum } });

//     if (rules[cachedIndex].dataElement == "summary") {
//         msg = "Your order of a " + customer[0].size + " pizza with " + customer[0].toppings + " will be delivered to " + customer[0].address;
//         message.createAndSend(endpoint, payload, msg, context);
//         await collection.updateOne({ userId: payload.user }, { $set: { size: null, toppings: null, address: null } });
//     }
// }

async function parseQuery(query) {

    query = query.split(" ");
    var returnObject = {};

    query.forEach(async function (arg) {
        if (arg.includes("size:")) {
            var tempSize = arg.replace('size:', '');
            //await customerCollection.updateOne({ userId: payload.user }, { $set: { sizePizza: tempSize } });
            returnObject.sizePizza = tempSize; 
        } else if (arg.includes("topping:")) {
            var tempTopping = arg.replace('topping:', '');
            //await customerCollection.updateOne({ userId: payload.user }, { $addToSet: { toppings: tempTopping } });
            returnObject.toppings = tempTopping; 
        } else if (arg.includes("address:")) {
            var tempAddress = arg.replace('address:', '');
            //await customerCollection.updateOne({ userId: payload.user }, { $set: { address: tempAddress } });
            returnObject.address = tempAddress; 
        }
        else {
            returnObject.field = query[0];
        }
    });

    return returnObject;
}

module.exports = {
    orderPizza
};

