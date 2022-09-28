"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataFile = void 0;
class DataFile {
    constructor(data) {
        this.buffers = [];
        this.pos = 0;
        this.size = 0;
        if (data) {
            this.buffers.push(data);
            this.size = data.byteLength;
            this.pos = 0;
        }
    }
    read(size) {
        this.flatten();
        if (size + this.pos > this.size) {
            // size = this.size - this.pos;
            return null;
        }
        const oldPos = this.pos;
        this.pos += size;
        // return this.buffers[0].subarray(oldPos, this.pos);
        return this.buffers[0].slice(oldPos, this.pos);
    }
    readAll() {
        this.flatten();
        return this.buffers[0] || new Uint8Array();
    }
    write(data) {
        this.buffers.push(data);
        this.size += data.byteLength;
        this.pos += data.byteLength;
        return true;
    }
    tell() {
        return this.pos;
    }
    seek(pos, method) {
        let newPos = this.pos;
        if (method === 'SET') {
            newPos = pos;
        }
        else if (method === 'CUR') {
            newPos += pos;
        }
        else {
            newPos = this.size - pos;
        }
        if (newPos < 0 || newPos > this.size) {
            return false;
        }
        this.pos = newPos;
        return true;
    }
    flatten() {
        if (this.buffers.length <= 1) {
            return;
        }
        const newBuffer = new Uint8Array(this.size);
        let offset = 0;
        for (const buffer of this.buffers) {
            newBuffer.set(buffer, offset);
            offset += buffer.byteLength;
        }
        this.buffers = [newBuffer];
    }
}
exports.DataFile = DataFile;
//# sourceMappingURL=ExtractorData.helper.js.map