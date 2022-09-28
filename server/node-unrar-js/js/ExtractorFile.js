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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtractorFile = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const Extractor_1 = require("./Extractor");
class ExtractorFile extends Extractor_1.Extractor {
    constructor(
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types,@typescript-eslint/no-explicit-any
    unrar, filepath, targetPath, password, filenameTransform) {
        super(unrar, password);
        this.filenameTransform = filenameTransform;
        this._filePath = filepath;
        this.fileMap = {};
        this._target = targetPath;
    }
    open(filename) {
        const fd = fs.openSync(filename, 'r');
        this.fileMap[fd] = {
            size: fs.fstatSync(fd).size,
            pos: 0,
            name: filename,
        };
        return fd;
    }
    create(filename) {
        const fullpath = path.join(this._target, this.filenameTransform(filename));
        const dir = path.parse(fullpath).dir;
        // Skip if directory is the current directory
        if (dir !== '') {
            fs.mkdirSync(dir, { recursive: true });
        }
        const fd = fs.openSync(fullpath, 'w');
        this.fileMap[fd] = {
            size: 0,
            pos: 0,
            name: filename,
        };
        return fd;
    }
    closeFile(fd) {
        delete this.fileMap[fd];
        fs.closeSync(fd);
    }
    read(fd, buf, size) {
        const file = this.fileMap[fd];
        const buffer = Buffer.allocUnsafe(size);
        const readed = fs.readSync(fd, buffer, 0, size, file.pos);
        this.unrar.HEAPU8.set(buffer, buf);
        file.pos += readed;
        return readed;
    }
    write(fd, buf, size) {
        const file = this.fileMap[fd];
        const writeNum = fs.writeSync(fd, Buffer.from(this.unrar.HEAPU8.subarray(buf, buf + size)), 0, size);
        file.pos += writeNum;
        file.size += writeNum;
        return writeNum === size;
    }
    tell(fd) {
        return this.fileMap[fd].pos;
    }
    seek(fd, pos, method) {
        const file = this.fileMap[fd];
        let newPos = file.pos;
        if (method === 'SET') {
            newPos = 0;
        }
        else if (method === 'END') {
            newPos = file.size;
        }
        newPos += pos;
        if (newPos < 0 || newPos > file.size) {
            return false;
        }
        file.pos = newPos;
        return true;
    }
}
exports.ExtractorFile = ExtractorFile;
//# sourceMappingURL=ExtractorFile.js.map