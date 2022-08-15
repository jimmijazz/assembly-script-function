"use strict";
exports.__esModule = true;
exports.main = void 0;
require("wasi");
var assembly_1 = require("as-wasi/assembly");
var assembly_2 = require("assemblyscript-json/assembly");
function main() {
    var input = assembly_1.Console.readAll();
    var config = assembly_2.JSON.parse(input);
    var lines = config.getObj("cart").getArr("lines");
    var output = assembly_2.JSON.Value.Object();
    var discounts = [];
    var linesArray = lines.valueOf();
    for (var i = 0; i < linesArray.length; ++i) {
        discounts.push(i);
        var merchandiseLine = linesArray[i];
    }
    ;
    output.set("discounts", assembly_2.JSON.from(discounts));
    output.set("discountApplicationStrategy", assembly_2.JSON.from("MAXIMUM"));
    assembly_1.Console.log(output.stringify());
}
exports.main = main;
;
main();
