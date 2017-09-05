const elfy = require('elfy');
const Promise = require('bluebird');
const fsReadFile = Promise.promisify(require('fs').readFile);
const CustomError = require('./error');
const util = require('util');
const leb128 = require('leb128');
const int64 = require('node-int64');
const clone = require('clone');
const path = require('path');
const constants = require('./constants');

const DW_LNS_copy = 0x01;
const DW_LNS_advance_pc = 0x02;
const DW_LNS_advance_line = 0x03;
const DW_LNS_set_file = 0x04;
const DW_LNS_set_column = 0x05;
const DW_LNS_negate_stmt = 0x06;
const DW_LNS_set_basic_block = 0x07;
const DW_LNS_const_add_pc = 0x08;
const DW_LNS_fixed_advance_pc = 0x09;
const DW_LNS_set_prologue_end = 0x0a;
const DW_LNS_set_epilogue_begin = 0x0b;
const DW_LNS_set_isa = 0x0c;

const DW_LNE_end_sequence = 0x01;
const DW_LNE_set_address = 0x02;
const DW_LNE_define_file = 0x03;
const DW_LNE_set_discriminator = 0x04;
const DW_LNE_lo_user = 0x80;
const DW_LNE_hi_user = 0xff;

const DW_CU_HEADER_SIZE_32 = 11;
const DW_ARANGE_HEADER_SIZE_32 = 12;
const DW_CHILDREN_yes = 0x01;
const DW_CHILDREN_no = 0x00;

class ElfFileError extends CustomError {
  constructor(message) {
    super(message);
  }
};

class DwarfParserError extends CustomError {
  constructor(message) {
    super(message);
  }
};

class ElfFile {
  constructor(file) {
    this._data = null;
    this._path = null;
    this._elf = null;

    if (file instanceof Buffer) {
      this._data = file;
    } else if (typeof file ==='string' || file instanceof String) {
      this._path = file;
    }
  }

  parse() {
    return this._readFile().then((data) => {
      return Promise.try(() => {
        this._elf = elfy.parse(data);
        return this;
      }).catch((e) => {
        return Promise.reject(new ElfFileError('Error while parsing elf file: ' + e.message));
      });
    });
  }

  _readFile() {
    if (this._path) {
      return fsReadFile(this._path).then((data) => {
        this._data = data;
        return this._data;
      });
    } else if (this._data) {
      return Promise.resolve(this._data);
    } else {
      return Promise.reject(new ElfFileError('No elf file path specified and no Buffer object supplied'));
    }
  }

  getSection(name) {
    if (this._elf && this._elf.body && this._elf.body.sections) {
      return this._elf.body.sections.find((el) => {
        return el.name && el.name === name;
      });
    }
  }
};

function readULeb128(buf) {
  const val = leb128.unsigned.decode(buf);
  const size = leb128.unsigned.encode(val).length;
  const val64 = new int64(val);
  if (!isFinite(val64)) {
    throw new DwarfParserError('Read LEB128 value does not fit JS Number type');
  }
  return {v: parseInt(val), size: size};
};

function readSLeb128(buf) {
  const val = leb128.signed.decode(buf);
  const size = leb128.signed.encode(val).length;
  const val64 = new int64(val);
  if (!isFinite(val64)) {
    throw new DwarfParserError('Read LEB128 value does not fit JS Number type');
  }
  return {v: parseInt(val), size: size};
};

function readCString(buf) {
  const n = buf.indexOf('\0');
  if (n === -1) {
    throw new DwarfParserError('Failed to parse C string');
  }
  return buf.slice(0, n).toString();
};

function readAddress(size, buf, offset) {
  switch(size) {
    case 1:
      return buf.readUInt8(offset);
    case 2:
      return buf.readUInt16LE(offset);
    case 4:
      return buf.readUInt32LE(offset);
    case 8: {
      const val64 = new int64(buf, offset);
      if (!isFinite(val64)) {
        throw new DwarfParserError('Read 64-bit integer does not fit JS Number type');
      }
      return parseInt(val64.toString());
    }
    default:
      throw new DwarfParserError('Unsupported address size: ' + size);
  }
};

class DwarfLineNumberProgram {
  constructor(buf, address_size) {
    this._buf = buf;
    this._state = {
      address: 0,
      op_index: 0,
      file: 1,
      line: 1,
      column: 0,
      is_stmt: 0, // Will be determined after parsing the header
      basic_block: false,
      end_sequence: false,
      prologue_end: false,
      epilogue_begin: false,
      isa: 0,
      discriminator: 0
    };
    this._address_size = address_size;
  }

  parse() {
    this._program = {};
    this._parseHeader();
    this._parseProgram();
    return this._normalize();
  }

  _resetState() {
    this._state = {
      address: 0,
      op_index: 0,
      file: 1,
      line: 1,
      column: 0,
      is_stmt: this._program.default_is_stmt || 0,
      basic_block: false,
      end_sequence: false,
      prologue_end: false,
      epilogue_begin: false,
      isa: 0,
      discriminator: 0
    };
  }

  _parseHeader() {
    let program = {};
    let offset = 0;
    program.unit_length = this._buf.readUInt32LE(offset);
    if (program.unit_length >= 0xfffffff0) {
      throw new DwarfParserError('64-bit DWARF format is not supported');
    }
    program.total_size = program.unit_length + 4;

    program.version = this._buf.readUInt16LE(offset + 4);
    program.header_length = this._buf.readUInt32LE(offset + 6);
    program.total_header_length = 10 + program.header_length;
    program.minimum_instruction_length = this._buf.readUInt8(offset + 10);
    if (program.version >= 4) {
      program.maximum_operations_per_instruction = this._buf.readUInt8(offset + 11);
      offset += 12;
    } else {
      program.maximum_operations_per_instruction = 1;
      offset += 11;
    }
    program.default_is_stmt = this._buf.readUInt8(offset);
    program.line_base = this._buf.readInt8(offset + 1);
    program.line_range = this._buf.readInt8(offset + 2);
    program.opcode_base = this._buf.readUInt8(offset + 3);
    offset += 4;
    program.standard_opcode_lengths = [];
    for(let i = 0; i < program.opcode_base - 1; i++) {
      program.standard_opcode_lengths.push(this._buf.readUInt8(offset));
      offset += 1;
    }
    program.include_directories = [];
    while(offset < program.total_header_length) {
      const s = readCString(this._buf.slice(offset));
      offset += s.length + 1;
      if (s.length === 0) {
        break;
      }
      program.include_directories.push(s);
    }
    program.file_names = [];
    while(offset < program.total_header_length) {
      const f = readCString(this._buf.slice(offset));
      offset += f.length + 1;
      if (f.length === 0) {
        break;
      }
      const dir = readULeb128(this._buf.slice(offset));
      offset += dir.size;
      const time = readULeb128(this._buf.slice(offset));
      offset += time.size;
      const size = readULeb128(this._buf.slice(offset));
      offset += size.size;
      program.file_names.push({name: f, dir: dir.v, time: time.v, size: size.v});
    }

    program.data = this._buf.slice(program.total_header_length, program.total_size);
    program.decoded = [];

    this._program = program;
    this._state.is_stmt = program.default_is_stmt;
  }

  _addEntry() {
    this._program.decoded.push(clone(this._state));
  }

  _parseProgram() {
    let matrix = [];
    let offset = 0;
    const maximum_operations_per_instruction = this._program.maximum_operations_per_instruction;
    while(offset < this._program.data.length) {
      const opcode = this._program.data.readUInt8(offset);
      offset += 1;
      if (opcode > this._program.opcode_base) {
        // Special opcode
        const adjusted_opcode = opcode - this._program.opcode_base;
        const op_advance = (adjusted_opcode / this._program.line_range) | 0;
        if (maximum_operations_per_instruction === 1) {
          this._state.address += this._program.minimum_instruction_length * op_advance;
        } else {
          this._state.address += (this._program.minimum_instruction_length * ((this._state.op_index + op_advance) / this._program.maximum_operations_per_instruction) | 0);
          this._state.op_index = (this._state.op_index + op_advance) % this._program.maximum_operations_per_instruction;
        }
        this._state.line += this._program.line_base + (adjusted_opcode % this._program.line_range);
        this._addEntry();
        this._state.discriminator = 0;
        this._state.basic_block = false;
        this._state.prologue_end = false;
        this._state.epilogue_begin = false;
      } else if (opcode === 0) {
        // Extended opcode
        const instruction_size = readULeb128(this._program.data.slice(offset));
        offset += instruction_size.size;
        const extended_opcode = this._program.data.readUInt8(offset);
        offset += 1;
        const data = this._program.data.slice(offset, offset + instruction_size.v - 1);
        offset += instruction_size.v - 1;

        switch(extended_opcode) {
          case DW_LNE_end_sequence: {
            this._state.end_sequence = true;
            this._addEntry();
            this._resetState();
            break;
          }
          case DW_LNE_set_address: {
            // Fixme size
            this._state.address = readAddress(this._address_size, data);
            this._state.op_index = 0;
            break;
          }
          case DW_LNE_define_file: {
            const f = readCString(data);
            let o = f.length + 1;
            const dir = readULeb128(data.slice(o));
            o += dir.size;
            const time = readULeb128(data.slice(o));
            o += time.size;
            const size = readULeb128(data.slice(o));
            o += size.size;
            this._program.file_names.push({name: f, dir: dir.v, time: time.v, size: size.v});
            break;
          }
          case DW_LNE_set_discriminator: {
            const d = readULeb128(data);
            this._state.discriminator = d.v;
            break;
          }
        }
      } else {
        // Standard opcode
        switch(opcode) {
          case DW_LNS_copy: {
            this._addEntry();
            this._state.discriminator = 0;
            this._state.basic_block = false;
            this._state.prologue_end = false;
            this._state.epilogue_begin = false;
            break;
          }
          case DW_LNS_advance_pc: {
            const adv = readULeb128(this._program.data.slice(offset));
            offset += adv.size;
            if (maximum_operations_per_instruction === 1) {
              this._state.address += adv.v * this._program.minimum_instruction_length;
            } else {
              this._state.address = (((this._state.op_index + adv.v) / maximum_operations_per_instruction) | 0) * this._program.minimum_instruction_length;
              this._state.op_index = (this._state.op_index + adv.v) % maximum_operations_per_instruction;
            }
            break;
          }
          case DW_LNS_advance_line: {
            const adv = readSLeb128(this._program.data.slice(offset));
            offset += adv.size;
            this._state.line += adv.v;
            break;
          }
          case DW_LNS_set_file: {
            const f = readULeb128(this._program.data.slice(offset));;
            offset += f.size;
            this._state.file = f.v;
            break;
          }
          case DW_LNS_set_column: {
            const c = readULeb128(this._program.data.slice(offset));
            offset += c.size;
            this._state.column = c.v;
            break;
          }
          case DW_LNS_negate_stmt: {
            this._state.is_stmt = !this._state.is_stmt;
            break;
          }
          case DW_LNS_set_basic_block: {
            this._state.basic_block = true;
            break;
          }
          case DW_LNS_const_add_pc: {
            const adjusted_opcode = 255 - this._program.opcode_base;
            const op_advance = (adjusted_opcode / this._program.line_range) | 0;
            if (maximum_operations_per_instruction === 1) {
              this._state.address += this._program.minimum_instruction_length * op_advance;
            } else {
              this._state.address += (this._program.minimum_instruction_length * ((this._state.op_index + op_advance) / this._program.maximum_operations_per_instruction) | 0);
              this._state.op_index = (this._state.op_index + op_advance) % this._program.maximum_operations_per_instruction;
            }
            break;
          }
          case DW_LNS_fixed_advance_pc: {
            const adv = this._program.data.readUInt16LE(offset);
            offset += 2;
            this._state.address += adv;
            this._state.op_index = 0;
            break;
          }
          case DW_LNS_set_prologue_end: {
            this._state.prologue_end = true;
            break;
          }
          case DW_LNS_set_epilogue_begin: {
            this._state.epilogue_begin = true;
            break;
          }
          case DW_LNS_set_isa: {
            const isa = readULeb128(this._program.data.slice(offset));
            offset += isa.size;
            this._state.isa = isa.v;
            break;
          }
        }
      }
    }
  }

  _normalize() {
    let normalized = [];
    this._program.decoded.forEach((entry) => {
      // if (!entry.end_sequence) {
        const f = this._program.file_names[entry.file - 1];
        let file = f.name;
        if (f.dir > 0) {
          file = path.join(this._program.include_directories[f.dir - 1], file);
        }
        normalized.push({address: entry.address, file: file, line: entry.line});
      // }
    });
    return normalized;
  }
};

function dwarfAttributeClass(attr) {
  let c = constants.DW_FORM_classes[attr.form];
  if (c === 'indirect') {
    if (attr.indirect) {
      c = constants.DW_FORM_classes[attr.indirect.form];
    } else {
      c = undefined;
    }
  }

  return c;
};

class DwarfParser {
  constructor(elf) {
    this._elf = elf;
    this._debug_info = null;
    this._debug_abbrev = null;
    this._cus = {};
  }

  parse() {
    this._debug_info = this._elf.getSection('.debug_info');
    this._debug_abbrev = this._elf.getSection('.debug_abbrev');
    this._debug_aranges = this._elf.getSection('.debug_aranges');
    this._debug_line = this._elf.getSection('.debug_line');
    this._debug_str = this._elf.getSection('.debug_str');
    this._debug_ranges = this._elf.getSection('.debug_ranges');
    if (!this._debug_info) {
      throw new DwarfParserError('No .debug_info DWARF section found');
    }

    if (!this._debug_abbrev) {
      throw new DwarfParserError('No .debug_abbrev DWARF section found');
    }

    if (!this._debug_aranges) {
      throw new DwarfParserError('No .debug_aranges DWARF section found');
    }

    if (!this._debug_line) {
      throw new DwarfParserError('No .debug_line DWARF section found');
    }

    if (!this._debug_str) {
      throw new DwarfParserError('No .debug_str DWARF section found');
    }

    if (!this._debug_ranges) {
      throw new DwarfParserError('No .debug_ranges DWARF section found');
    }

    this._parseRangeInfo();
  }

  resolve(address) {
    if (typeof address === 'string' || address instanceof String) {
      address = parseInt(address);
    }
    const cu = this._CUFromAddress(address);
    if (cu) {
      let info = this._addressToFileLine(cu, address);
      if (info) {
        const f = this._addressToFunction(cu, address);
        if (f) {
          info.function = f;
        }
        return info;
      }
    }
  }

  _parseRangeInfo() {
    let offset = 0;
    let ranges = [];
    while (offset < this._debug_aranges.data.length) {
      let range = this._parseRangeSet(offset);
      offset += range.total_size;
      ranges.push(range);
    }
    this._ranges = ranges;
  }

  _CUFromAddress(addr) {
    if (this._ranges) {
      let r = this._ranges.find((rangeset) => {
        let range = rangeset.ranges.find((r) => {
          if (addr >= r.address && addr < (r.address + r.size)) {
            return true;
          }
          return false;
        });
        if (range !== undefined) {
          return true;
        }
        return false;
      });
      if (r !== undefined) {
        if (this._cus[r.debug_info_offset]) {
          return this._cus[r.debug_info_offset];
        }
        let cu = this._parseCU(r.debug_info_offset);
        if (cu) {
          this._parseAbbrev(cu);
          this._parseCUAttributes(cu);
          this._parseCULineNumberPrograms(cu);
        }
        this._cus[r.debug_info_offset] = cu;
        return cu;
      }
    }
  }

  _parseCULineNumberPrograms(cu) {
    // Find DW_AT_stmt_list attributes
    cu.dies.forEach((die) => {
      die.attributes.forEach((attr) => {
        if (attr.at === 'DW_AT_stmt_list') {
          let lp = new DwarfLineNumberProgram(this._debug_line.data.slice(attr.value), cu.address_size);
          const parsed = lp.parse();
          attr.parsed = parsed;
        }
      });
    });
  }

  _addressToFileLine(cu, address) {
    let result = undefined;
    cu.dies.every((die) => {
      return die.attributes.every((attr) => {
        if (attr.at === 'DW_AT_stmt_list' && attr.parsed) {
          for(let i = 0; i < attr.parsed.length - 1; i++) {
            const e = attr.parsed[i];
            const next = attr.parsed[i + 1];
            if (address === e.address || (address >= e.address && address < next.address)) {
              result = clone(e);
              result.address = address;
              return false;
            }
          }
        }
        return true;
      });
    });
    return result;
  }

  _parseRangeList(cu, roffset) {
    const data = this._debug_ranges.data.slice(roffset);
    const cutag = cu.dies.find((d) => {
      return d.tag === 'DW_TAG_compile_unit';
    });
    let base_address = 0x0;
    if (cutag) {
      const lowpc = cutag.attributes.find((a) => {
        return a.at === 'DW_AT_low_pc';
      });
      if (lowpc) {
        base_address = lowpc.value;
      }
    }
    let offset = 0;
    let result = [];

    while(offset < data.length) {
      const begin = readAddress(cu.address_size, data, offset);
      offset += 4;
      const end = readAddress(cu.address_size, data, offset);
      offset += 4;
      if (begin === 0 && end === 0) {
        break;
      }

      if (begin === readAddress(cu.address_size, Buffer.allocUnsafe(8).fill(0xff))) {
        // Set base address
        base_address = end;
      } else {
        result.push([base_address + begin, base_address + end]);
      }
    }
    return result;
  }

  _addressToFunction(cu, address) {
    let result = undefined;
    cu.dies.every((die) => {
      if (die.tag === 'DW_TAG_subprogram') {
        const name = die.attributes.find((attr) => {
          return attr.at === 'DW_AT_name';
        });
        const low_pc = die.attributes.find((attr) => {
          return attr.at === 'DW_AT_low_pc';
        });
        const high_pc = die.attributes.find((attr) => {
          return attr.at === 'DW_AT_high_pc';
        });
        const ranges = die.attributes.find((attr) => {
          return attr.at === 'DW_AT_ranges';
        });
        if ((ranges || (low_pc && high_pc))) {
          if (ranges) {
            const r = this._parseRangeList(cu, ranges.value);
            r.every((rl) => {
              if (address >= rl[0] && address < rl[1]) {
                result = name.value;
                return false;
              }
              return true;
            });
          } else {
            const low = low_pc.value;
            let high = high_pc.value;

            if (dwarfAttributeClass(high_pc) === 'constant') {
              switch(high_pc.form) {
                case 'DW_FORM_data1': {
                  high = high.readUInt8(high);
                  break;
                }
                case 'DW_FORM_data2': {
                  high = high.readUInt16LE(high);
                  break;
                }
                case 'DW_FORM_data4': {
                  high = high.readUInt32LE(high);
                  break;
                }
                case 'DW_FORM_data8': {
                  high = new int64(high);
                  if (!isFinite(high)) {
                    throw new DwarfParserError('Read 64-bit integer value does not fit JS Number type');
                  }
                  break;
                }
                case 'DW_FORM_sdata': {
                  const v = readULeb128(high);
                  high = v.v;
                  break;
                }
                case 'DW_FORM_udata': {
                  const v = readSLeb128(high);
                  high = v.v;
                  break;
                }
              }
              high = low + high;
            }
            if (address >= low && address < high) {
              if (name) {
                result = name.value;
              } else {
                const specification_name = this._resolveCppName(cu, die);
                if (specification_name) {
                  result = specification_name;
                }
              }
              return false;
            }
          }
        }
      }
      return true;
    });
    return result;
  }

  _resolveCppName(cu, die) {
    const spec = die.attributes.find((attr) => {
      return attr.at === 'DW_AT_specification' || attr.at === 'DW_AT_abstract_origin';
    });
    if (spec) {
      let offset = spec.value;
      if (spec.form === 'DW_FORM_ref_addr') {
        offset -= cu.offset;
      }
      offset -= DW_CU_HEADER_SIZE_32;
      const refindex = cu.die_offsets[offset];
      if (refindex) {
        const ref = cu.dies[refindex];
        if (ref) {
          const name = ref.attributes.find((attr) => {
            return attr.at === 'DW_AT_name';
          });
          let prefix = '';
          let parent = undefined;
          for (let parentidx = ref.parent; parentidx !== undefined; parentidx = parent.parent) {
            parent = cu.dies[parentidx];
            if (parent.tag === 'DW_TAG_class_type' || parent.tag === 'DW_TAG_namespace') {
              const pname = parent.attributes.find((attr) => {
                return attr.at === 'DW_AT_name';
              });
              if (pname) {
                prefix = pname.value + '::' + prefix;
              }
            }
          }
          if (name) {
            return prefix.length > 0 ? prefix + name.value : name.value;
          }
        }
      }
    }
  }

  _parseCU(offset) {
    let cu = {};
    cu.unit_length = this._debug_info.data.readUInt32LE(offset);
    if (cu.unit_length >= 0xfffffff0) {
      throw new DwarfParserError('64-bit DWARF format is not supported');
    }

    cu.version = this._debug_info.data.readUInt16LE(offset + 4);
    cu.debug_abbrev_offset = this._debug_info.data.readUInt32LE(offset + 6);
    cu.address_size = this._debug_info.data.readUInt8(offset + 10);
    cu.total_size = cu.unit_length + 4;
    cu.offset = offset;
    cu.abbrev = {};
    cu.abbrev_data = this._debug_abbrev.data.slice(cu.debug_abbrev_offset);
    cu.data = this._debug_info.data.slice(offset + DW_CU_HEADER_SIZE_32, offset + cu.total_size);
    cu.dies = [];
    cu.die_offsets = {};
    return cu;
  }

  _parseAttributeData(attrib, cu, offset) {
    switch(attrib.form) {
      case 'DW_FORM_addr': {
        attrib.value = readAddress(cu.address_size, cu.data, offset);
        offset += cu.address_size;
        break;
      }
      case 'DW_FORM_block1': {
        const len = cu.data.readUInt8(offset);
        offset += 1;
        attrib.value = cu.data.slice(offset, offset + len);
        offset += len;
        break;
      }
      case 'DW_FORM_data1': {
        attrib.value = cu.data.slice(offset, offset + 1);
        offset += 1;
        break;
      }
      case 'DW_FORM_block2': {
        const len = cu.data.readUInt16LE(offset);
        offset += 2;
        attrib.value = cu.data.slice(offset, offset + len);
        offset += len;
        break;
      }
      case 'DW_FORM_data2': {
        attrib.value = cu.data.slice(offset, offset + 2);
        offset += 2;
        break;
      }
      case 'DW_FORM_block4': {
        const len = cu.data.readUInt32LE(offset);
        offset += 4;
        attrib.value = cu.data.slice(offset, offset + len);
        offset += len;
        break;
      }
      case 'DW_FORM_data4': {
        attrib.value = cu.data.slice(offset, offset + 4);
        offset += 4;
        break;
      }
      case 'DW_FORM_data8': {
        attrib.value = cu.data.slice(offset, offset + 8);
        offset += 8;
        break;
      }
      case 'DW_FORM_string': {
        const n = cu.data.indexOf('\0', offset);
        attrib.value = cu.data.slice(offset, n).toString();
        offset = n + 1;
        break;
      }
      case 'DW_FORM_block': {
        const val = readULeb128(cu.data.slice(offset));
        offset += val.size;
        attrib.value = cu.data.slice(offset, offset + val.v);
        offset += val.v;
        break;
      }
      case 'DW_FORM_sdata':
      case 'DW_FORM_udata': {
        const val = readULeb128(cu.data.slice(offset));
        attrib.value = cu.data.slice(offset, offset + val.size);
        offset += val.size;
        break;
      }
      case 'DW_FORM_flag': {
        attrib.value = cu.data.readUInt8(offset);
        offset += 1;
        break;
      }
      case 'DW_FORM_strp': {
        const soffset = cu.data.readUInt32LE(offset);
        offset += 4;
        const n = this._debug_str.data.indexOf('\0', soffset);
        attrib.value = this._debug_str.data.slice(soffset, n).toString();
        break;
      }
      case 'DW_FORM_ref_addr': {
        const inoffset = cu.data.readUInt32LE(offset);
        offset += 4;
        attrib.value = inoffset;
        attrib.reference = this._debug_info.data.slice(inoffset);
        break;
      }
      case 'DW_FORM_ref1': {
        const inoffset = cu.data.readUInt8(offset);
        offset += 1;
        attrib.value = inoffset;
        attrib.reference = cu.data.slice(inoffset);
        break;
      }
      case 'DW_FORM_ref2': {
        const inoffset = cu.data.readUInt16LE(offset);
        offset += 2;
        attrib.value = inoffset;
        attrib.reference = cu.data.slice(inoffset);
        break;
      }
      case 'DW_FORM_ref4': {
        const inoffset = cu.data.readUInt32LE(offset);
        offset += 4;
        attrib.value = inoffset;
        attrib.reference = cu.data.slice(inoffset);
        break;
      }
      case 'DW_FORM_ref8': {
        const inoffset = new int64(cu.data.slice(offset, offset + 8));
        if (!isFinite(inoffset)) {
          throw new DwarfParserError('Read 64-bit integer value does not fit JS Number type');
        }
        offset += 8;
        attrib.value = inoffset;
        attrib.reference = cu.data.slice(parseInt(attrib.value));
        break;
      }
      case 'DW_FORM_ref_udata': {
        const val = readULeb128(cu.data.slice(offset));
        offset += val.size;
        attrib.value = val.v;
        attrib.reference = cu.data.slice(parseInt(attrib.value));
        break;
      }
      case 'DW_FORM_indirect': {
        const val = readULeb128(cu.data.slice(offset));
        offset += val.size;
        let fattrib = {form: val.v};
        fattrib.form = constants.DW_FORM_map[fattrib.form] || fattrib.form;
        offset = this._parseAttributeData(fattrib, cu, offset);
        attrib.value = form;
        attrib.indirect = fattrib;
        break;
      }
      case 'DW_FORM_sec_offset': {
        const val = cu.data.readUInt32LE(offset);
        offset += 4;
        attrib.value = val;
        break;
      }
      case 'DW_FORM_exprloc': {
        const val = readULeb128(cu.data.slice(offset));
        offset += val.size;
        attrib.value = val.v;
        attrib.exprloc = cu.data.slice(offset, offset + val.v);
        offset += val.v;
        break;
      }
      case 'DW_FORM_flag_present': {
        attrib.value = true;
        break;
      }
      case 'DW_FORM_ref_sig8': {
        attrib.value = new int64(cu.data.slice(offset, offset + 8));
        offset += 8;
        break;
      }
    }
    return offset;
  }

  _parseCUAttributes(cu) {
    let offset = 0;
    let parent = [];
    while (offset < cu.data.length) {
      const begin = offset;
      const val = readULeb128(cu.data.slice(offset));
      const code = val.v;
      offset += val.size;
      if (code === 0) {
        let die = {code: 0, attributes: []};
        cu.dies.push(die);
        cu.die_offsets[begin] = cu.dies.length - 1;
        parent.pop();
        continue;
      }
      let abbrev = cu.abbrev[code];
      if (abbrev === undefined) {
        throw new DwarfParserError('Couldn\'t find entry in the abbreviation table with code = ' + code);
      }
      let die = clone(abbrev);
      die.attributes.forEach((attrib) => {
        offset = this._parseAttributeData(attrib, cu, offset);
      });
      cu.dies.push(die);
      cu.die_offsets[begin] = cu.dies.length - 1;
      if (parent.length) {
        die.parent = parent[parent.length - 1];
      }
      if (die.children === 1) {
        parent.push(cu.dies.length - 1);
      }
    }
    return offset;
  }

  _parseAbbrev(cu) {
    let offset = 0;
    let abbrev = {};
    while(offset < cu.abbrev_data.length) {
      let entry = this._parseAbbrevEntry(cu, offset);
      offset = entry.next;
      if (entry.code === 0) {
        break;
      }
      abbrev[entry.code] = entry;
    }
    cu.abbrev = abbrev;
  }

  _parseAbbrevEntry(cu, offset) {
    let abbrev = {};
    let val = readULeb128(cu.abbrev_data.slice(offset));
    let l = val.size;
    abbrev.code = val.v;
    if (abbrev.code === 0) {
      abbrev.next = offset + l;
      return abbrev;
    }
    val = readULeb128(cu.abbrev_data.slice(offset + l));
    abbrev.tag = val.v;
    l += val.size;
    let children = cu.abbrev_data.readUInt8(offset + l);
    abbrev.children = children;
    l += 1;
    let attributes = [];
    while(true) {
      val = readULeb128(cu.abbrev_data.slice(offset + l));
      const attrib = val.v;
      l += val.size;
      val = readULeb128(cu.abbrev_data.slice(offset + l));
      const form = val.v;
      l += val.size;
      if (attrib === 0 && form === 0) {
        break;
      }
      attributes.push({at: attrib, form: form});
    }
    abbrev.attributes = attributes;
    abbrev.next = offset + l;
    this._resolveNames(abbrev);
    return abbrev;
  }

  _resolveNames(abbrev) {
    abbrev.tag = constants.DW_TAG_map[abbrev.tag] || abbrev.tag;
    abbrev.attributes.forEach((attrib) => {
      if (attrib.at != 0 && attrib.form != 0) {
        attrib.at = constants.DW_AT_map[attrib.at] || attrib.at;
        attrib.form = constants.DW_FORM_map[attrib.form] || attrib.form;
      }
    });
  }

  _parseRangeSet(offset) {
    let rangeset = {};
    rangeset.unit_length = this._debug_aranges.data.readUInt32LE(offset);
    if (rangeset.unit_length >= 0xfffffff0) {
      throw new DwarfParserError('64-bit DWARF format is not supported');
    }

    rangeset.version = this._debug_aranges.data.readUInt16LE(offset + 4);
    rangeset.debug_info_offset = this._debug_aranges.data.readUInt32LE(offset + 6);
    rangeset.address_size = this._debug_aranges.data.readUInt8(offset + 10);
    rangeset.segment_size = this._debug_aranges.data.readUInt8(offset + 11);
    rangeset.total_size = rangeset.unit_length + 4;

    let ranges = [];
    let l = DW_ARANGE_HEADER_SIZE_32;
    l += (offset + l) % (rangeset.address_size * 2 + rangeset.segment_size);
    while(l < (rangeset.total_size - DW_ARANGE_HEADER_SIZE_32)) {
      let r = {};
      if (rangeset.segment_size != 0) {
        let s = readAddress(rangeset.segment_size, this._debug_aranges.data, offset + l);
        l += rangeset.segment.size;
        r.segment = s;
      }
      let start = readAddress(rangeset.address_size, this._debug_aranges.data, offset + l);
      l += rangeset.address_size;
      let sz = readAddress(rangeset.address_size, this._debug_aranges.data, offset + l);
      l += rangeset.address_size;
      if (start === 0 && sz === 0 && (rangeset.segment_size === 0 || r.segment === 0)) {
        break;
      }
      r.address = start;
      r.size = sz;
      ranges.push(r);
    }
    rangeset.ranges = ranges;
    rangeset.offset = offset;
    return rangeset;
  }
};

module.exports = {
  ElfFile: ElfFile,
  DwarfParser: DwarfParser
};
