'use strict';

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
      this._initialized = (async () => {
        for (const binary of this._binaries) {
          const elf = new dwarf.ElfFile(binary);
          await elf.parse();
          const parser = new dwarf.DwarfParser(elf);
          parser.parse();
          this._dwarves.push(parser);
        }
      })();
      this._initialized = this._initialized.then(() => this);
    }
    return this._initialized;
  }

  async resolve(addr) {
    await this._init();
    for (const d of this._dwarves) {
      const r = d.resolve(addr);
      if (r) {
        r.filename = r.file;
        delete r.file;
        return r;
      }
    }
    return undefined;
  }

  static addr2line(binaries, addr, opts) {
    const resolver = new Addr2Line(binaries, opts);
    return resolver.resolve(addr);
  }
};

module.exports = {
  Addr2Line: Addr2Line,
  addr2line: Addr2Line.addr2line
}