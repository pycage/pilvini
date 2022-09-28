"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUnrar = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
const unrar_1 = __importDefault(require("./unrar"));
let unrar;
async function getUnrar(options) {
    if (!unrar) {
        unrar = await (0, unrar_1.default)(options);
    }
    return unrar;
}
exports.getUnrar = getUnrar;
//# sourceMappingURL=unrar.singleton.js.map