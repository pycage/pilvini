"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createExtractorFromFile = void 0;
const ExtractorFile_1 = require("./js/ExtractorFile");
const unrar_singleton_1 = require("./js/unrar.singleton");
__exportStar(require("./index.esm"), exports);
async function createExtractorFromFile({ wasmBinary, filepath, targetPath = '', password = '', filenameTransform = (filename) => filename, }) {
    const unrar = await (0, unrar_singleton_1.getUnrar)(wasmBinary && { wasmBinary });
    const extractor = new ExtractorFile_1.ExtractorFile(unrar, filepath, targetPath, password, filenameTransform);
    unrar.extractor = extractor;
    return extractor;
}
exports.createExtractorFromFile = createExtractorFromFile;
//# sourceMappingURL=index.js.map