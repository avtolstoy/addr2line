## Usage

### Class instance:

```js
const Addr2Line = require('addr2line').Addr2Line;

let resolver = new Addr2Line(['/path/to/bin1.elf', '/path/to/bin2.elf']);
resolver.resolve('0x123456').then((res) => {
  console.log(res);
});
```

### Convenient wrapper

```js
const addr2line = require('addr2line').addr2line;

let resolver = addr2line(['/path/to/bin1.elf', '/path/to/bin2.elf'], '0x123456').then((res) => {
  console.log(res);
});
```

### Options
```js
const Addr2Line = require('addr2line').Addr2Line;

const opts = {
  // addr2line tool binary name
  bin: 'addr2line',
  // addr2line tool prefix
  // The resulting binary name is a concatenation of prefix and bin
  // e.g. {bin: 'addr2line', prefix: 'arm-none-eabi-'} -> 'arm-none-eabi-addr2line'
  prefix: '',
  // Unwind inlined functions
  inlines: true,
  // Strip path from filenames
  basenames: false,
  // Resolve functions
  functions: true,
  // Demange functions
  demangle: true
};

let resolver = new Addr2Line(['/path/to/bin1.elf', '/path/to/bin2.elf'], opts);
resolver.resolve('0x123456').then((res) => {
  console.log(res);
});
```
