const exec = require('child_process').exec;
const util = require('util');
const Promise = require('bluebird');

const DEFAULT_OPTIONS = {
  bin: 'addr2line',
  prefix: '',
  inlines: true,
  basenames: false,
  functions: true,
  demangle: true
};

function execPromise(args, opts) {
  opts = opts || {};
  return new Promise((resolve, reject) => {
    const proc = exec(args, opts, (err, stdout, stderr) => {
      if (err) {
        return reject(err);
      } else {
        return resolve({stdout: stdout, stderr: stderr});
      }
    });
  });
};

class Addr2Line {
  constructor(binaries, opts) {
    this._binaries = [];
    this._opts = DEFAULT_OPTIONS;

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
  }

  resolve(addr) {
    const exe = this._opts.prefix + this._opts.bin;
    let args = [];
    if (this._opts.inlines === true) {
      args.push('-i');
    }
    if (this._opts.basenames === true) {
      args.push('-s');
    }
    if (this._opts.functions === true) {
      args.push('-f');
    }
    if (this._opts.demangle === true) {
      args.push('-C');
    }

    return new Promise((resolve, reject) => {
      Promise.mapSeries(this._binaries, (binary) => {
        return execPromise(util.format('"%s" %s -e "%s" %s', exe, args.join(' '), binary, addr))
          .then((res) => {
            let parsed = this._parseOutput(res.stdout, res.stderr);
            if (parsed !== null) {
              return resolve(parsed);
            }
          })
          .catch((err) => {
          });
      });
    });
  }

  _parseOutput(stdout, stderr) {
    let lines = stdout.split(/\r?\n/g);
    if (lines.length >= 1) {
      let res = {};
      if (this._opts.functions === true && lines.length > 1) {
        res.function = lines.shift().trim();
      }
      let s = lines.shift().trim();
      let parts = s.split(':');
      res.filename = parts[0];
      res.line = parseInt(parts[1]);
      if (this.constructor._validate(res)) {
        return res;
      }
    }
    return null;
  }

  static _validate(obj) {
    if (obj.filename && obj.filename != '??') {
      return true;
    }

    return false;
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
