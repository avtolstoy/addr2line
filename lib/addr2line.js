const util = require('util');
const Promise = require('bluebird');
const dwarf = require('./dwarf');

class Addr2Line {
  constructor(binaries, opts) {
    this._binaries = [];
    this._dwarves = [];
    this._opts = {};
    this._initialized = undefined;

    if (binaries instanceof Array) {
      this._binaries = binaries;
    }

    if (opts instanceof Object) {
      Object.assign(this._opts, opts);
    }
  }

  addBinary(binary) {
    this._binaries.push(binary);
  }

  get binaries() {
    return this._binaries;
  }

  set binaries(binaries) {
    this._binaries = binaries;
    this._dwarves = [];
    this._initialized = undefined;
  }

  _init() {
    if (!this._initialized) {
      this._initialized = Promise.mapSeries(this._binaries, (binary) => {
        let elf = new dwarf.ElfFile(binary);
        return elf.parse().then(() => {
          let dp = new dwarf.DwarfParser(elf);
          dp.parse();
          this._dwarves.push(dp);
        });
      });
      return this._initialized;
    } else {
      return this._initialized;
    }
  }

  resolve(addr) {
    return this._init().then(() => {
      return new Promise((res, reject) => {
        let result = undefined;
        this._dwarves.every((dwarf) => {
          const r = dwarf.resolve(addr);
          if (r) {
            result = r;
            result.filename = result.file;
            delete result.file;
            return false;
          }
          return true;
        });
        return res(result);
      });
    });
  }

  static addr2line(binaries, addr, opts) {
    let resolver = new Addr2Line(binaries, opts);
    return resolver.resolve(addr);
  }
};

module.exports = {
  Addr2Line: Addr2Line,
  addr2line: Addr2Line.addr2line
}
