import "wasi";
import { Console } from "as-wasi/assembly";
import { JSON, JSONEncoder } from "assemblyscript-json/assembly";
import { Arr, Bool, Float, Obj } from "assemblyscript-json/assembly/JSON";

let stdin = Console.readAll();
let input: JSON.Obj = <JSON.Obj>(JSON.parse(stdin));

const lines = input.getObj("cart")!.getArr("lines") as JSON.Arr; 

let output = JSON.Value.Object();
let discounts = JSON.Value.Array();

// Find our location attributedd
let linesArray = lines.valueOf();

/* GET CART ATTRIBUTES (DEPRECATED) - Stopped using cart attributes because they won't work with all checkouts and were being removed when going from cart > checkout. Using all line item props and metafields now
*/

// let attributes = input.getObj("cart")!.getObj("attribute") as JSON.Obj; // Initially thought this would be an array, but in our input.json we specify just the attribute we want
// let location_key:string = "location"
// let selected_location:string = "";

// if (attributes) {
//   let attributeValue = attributes.getString("value");
//   if (attributeValue) {
//     selected_location = attributeValue.valueOf()
//   }
// };

// attributes.valueOf().forEach((attribute) => { // Note: Cart attributes won't work on accelerated checkouts. Use line item properties
//   let a = attribute as JSON.Obj;
//   let location: JSON.Str | null = a.getString("key");
  
//   if (location && location.toString() == location_key) {
//     let valueOrNull: JSON.Str | null = a.getString("value");
//     if (valueOrNull !== null) {
//       selected_location = valueOrNull.valueOf();
//     }
//   };
// });


 //END ATTRIBUTES CODE */

// console.log(`Selected Location: ${selected_location.toString()}`);


for (let i = 0; i < linesArray.length; ++i) {



  /*
  For each line item, create our Discount Object - https://shopify.dev/api/functions/reference/order-discounts/graphql/common-objects/discount
  Once done we will have multiple discount objects (potentially one for each line item)

  Each "Discount" object will contain:
    - Conditions for the discount to apply - https://shopify.dev/api/functions/reference/order-discounts/graphql/common-objects/condition
    - A message to display with the discount
    - An array of "targets" which are the variant ID's that the discount should be applied, with an optional "quantity" field - https://shopify.dev/api/functions/reference/order-discounts/graphql/common-objects/productvarianttarget
    - A Value object which discribes the discount - https://shopify.dev/api/functions/reference/order-discounts/graphql/common-objects/value

  We need something that looks like: 
        // let Discounts = discount[];
        // let discount = `{
        //       conditions : [],
        //       message : "Brisbane Pricing",
        //       targets : [
        //         {
        //           productVariant : {
        //             id : lineIDString
        //           }
        //         }
        //       ],
        //       value : {
        //         "fixedAmount" : {
        //           "amount" : discountAmount
        //         }
        //       }
        //     }`;
  */

  let discount = JSON.Value.Object(); 
  let lineItemObj: JSON.Obj = linesArray[i] as JSON.Obj; // Convert our line item to a JSON Object

  // Get Line Item Selected Location (replacing cart attribute approach)
  let location_key: string = "location";
  let selected_location:string  = "";

  let line_attributes = lineItemObj.getObj("attribute");

  if (lineItemObj && line_attributes) {
    let selected_location_value = line_attributes.getString("value");
    if (selected_location_value) {
      selected_location = selected_location_value.valueOf();
    }
  }


  // Line item price
  let linePriceVal: JSON.Str | null = JSON.Value.String("");

  let linePriceCostObj: JSON.Obj | null = lineItemObj.getObj("cost");
  
  if (linePriceCostObj) { // Another gross instance of nested error checking - using ?.getObj gives a type error
    let linePriceAmountPerQuantityObj = linePriceCostObj.getObj("amountPerQuantity");
    if (linePriceAmountPerQuantityObj) {
      linePriceVal = linePriceAmountPerQuantityObj.getString("amount");
    }
  }



  // Create fields for Discount Object
  let conditions = JSON.Value.Array();
  let message = JSON.Value.String("");
  let targets = JSON.Value.Array();
  let value = JSON.Value.Object();

  /* Create our list of variant targets */
  let target = JSON.Value.Object(); // https://shopify.dev/api/functions/reference/order-discounts/graphql/common-objects/target
  let productVariantTarget = JSON.Value.Object(); // https://shopify.dev/api/functions/reference/order-discounts/graphql/common-objects/target

  target.set("productVariant", productVariantTarget); // Push our target variant object into our target object
  targets.push(target);  // Push our target object into our list of targets

  /* Create our Value Object */
  let valueFixedAmount = JSON.Value.Object();
  let discountAmount:number = 0;

  /* Update our discount and discount message based on the selected location. 
    This is really the only section that's unique to this particular Function. The rest will be fairly re-usable

    TODO: Add better type / null checking
  */
  if (selected_location) {
    message = JSON.Value.String(`${selected_location} Pricing`); // Set our discount message Eg Brisbane Pricing
    let merchandiseObj: JSON.Obj | null = lineItemObj.getObj('merchandise');
    let pricingObject: JSON.Obj | null;


    if (merchandiseObj) {
      // Product Variant ID
      let lineIDStringValue: JSON.Str | null = merchandiseObj.getString("id");
      let lineID: string = "";
  
      if (lineIDStringValue) { // Push our line item ID to our target
        lineID = lineIDStringValue.valueOf().toString();
      };

      productVariantTarget.set("id", lineID.toString());

      pricingObject = merchandiseObj.getObj(`${selected_location.toLowerCase()}Pricing`);
      if (pricingObject) {
        let pricingVal = pricingObject.getString("value");
        if (pricingVal && linePriceVal) {
          discountAmount = parseInt(linePriceVal.toString()) - parseInt(pricingVal.toString()); // Calculate discount amount by (metafield value - line item price)
        }
      };
    };
  };
  valueFixedAmount.set("amount", discountAmount);
  value.set("fixedAmount", valueFixedAmount)

  // Add fields to our Discount Object
  discount.set("conditions", conditions);
  discount.set("message", message);
  discount.set("targets", targets);
  discount.set("value", value);
  discounts.push(discount); // Add to our discounts array
}

// Create our FunctionResult Object - https://shopify.dev/api/functions/reference/order-discounts/graphql/functionresult
output.set("discounts", discounts);
output.set("discountApplicationStrategy", JSON.from("MAXIMUM"));

Console.log(output.stringify());
