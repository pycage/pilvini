"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtractorData = void 0;
const ExtractorData_helper_1 = require("./ExtractorData.helper");
const Extractor_1 = require("./Extractor");
class ExtractorData extends Extractor_1.Extractor {
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types,@typescript-eslint/no-explicit-any
    constructor(unrar, data, password) {
        super(unrar, password);
        this.dataFiles = {};
        this.dataFileMap = {};
        this.currentFd = 1;
        const rarFile = {
            file: new ExtractorData_helper_1.DataFile(new Uint8Array(data)),
            fd: this.currentFd++,
        };
        this._filePath = '_defaultUnrarJS_.rar';
        this.dataFiles[this._filePath] = rarFile;
        this.dataFileMap[rarFile.fd] = this._filePath;
    }
    extract(options = {}) {
        const { arcHeader, files } = super.extract(options);
        function* getFiles() {
            for (const file of files) {
                if (!file.fileHeader.flags.directory) {
                    file.extraction =
                        this.dataFiles[this.getExtractedFileName(file.fileHeader.name)].file.readAll();
                }
                yield file;
            }
        }
        return { arcHeader, files: getFiles.call(this) };
    }
    getExtractedFileName(filename) {
        return `*Extracted*/${filename}`;
    }
    open(filename) {
        const dataFile = this.dataFiles[filename];
        if (!dataFile) {
            return 0;
        }
        return dataFile.fd;
    }
    create(filename) {
        const fd = this.currentFd++;
        this.dataFiles[this.getExtractedFileName(filename)] = {
            file: new ExtractorData_helper_1.DataFile(),
            fd: this.currentFd++,
        };
        this.dataFileMap[fd] = this.getExtractedFileName(filename);
        return fd;
    }
    closeFile(fd) {
        const fileData = this.dataFiles[this.dataFileMap[fd]];
        if (!fileData) {
            return;
        }
        fileData.file.seek(0, 'SET');
    }
    read(fd, buf, size) {
        const fileData = this.dataFiles[this.dataFileMap[fd]];
        if (!fileData) {
            return -1;
        }
        const data = fileData.file.read(size);
        if (data === null) {
            return -1;
        }
        this.unrar.HEAPU8.set(data, buf);
        return data.byteLength;
    }
    write(fd, buf, size) {
        const fileData = this.dataFiles[this.dataFileMap[fd]];
        if (!fileData) {
            return false;
        }
        fileData.file.write(this.unrar.HEAPU8.slice(buf, buf + size));
        return true;
    }
    tell(fd) {
        const fileData = this.dataFiles[this.dataFileMap[fd]];
        if (!fileData) {
            return -1;
        }
        return fileData.file.tell();
    }
    seek(fd, pos, method) {
        const fileData = this.dataFiles[this.dataFileMap[fd]];
        if (!fileData) {
            return false;
        }
        return fileData.file.seek(pos, method);
    }
}
exports.ExtractorData = ExtractorData;
//# sourceMappingURL=ExtractorData.js.map