export function mild_search_for_value(obj, value, callback, maxdepth = 5) {
  // this relies on object.values and object.keys which doesn't return all values and keys

  let numres = 0;

  const arr: unknown[] = [];
  const path_array: string[][] = [];

  arr.push(...Object.values(obj));
  for (const key of Object.keys(obj)) {
    path_array.push([key]);
  }

  const index = 0;
  while (arr.length) {
    const [val] = arr;
    if (val != window) {
      if (value === val) {
        callback(path_array[index], val);
        if (++numres == maxdepth) {
          arr.length = 0;
          return;
        }
      }
      if (typeof val === "object" && val) {
        Object.entries(val).forEach(([key, value]) => {
          arr.push(value);
          path_array.push([...path_array[index], key]);
        });
      }
    }

    arr.splice(index, 1);
    path_array.splice(index, 1);
  }
}

export function search_for_value(obj, value, callback, maxdepth = 5) {
  // this relies on for ... in which returns much more but it throws nondebuggable errors in firefox
  // advantage: can i.e. search Document's albeit veeeeeeeeeeeerrry slooooooowly
  // it will also go into elements if it finds them which drastically decreases how fast it gets into depth

  let numres = 0;

  const arr = values(obj);
  const path_array: string[][] = [];

  for (const key in obj) {
    path_array.push([key]);
  }

  const index = 0;
  while (arr.length) {
    const [val] = arr;
    if (val != window && (value == document || val != document)) {
      if (value === val) {
        callback(path_array[index], val);
        if (++numres == maxdepth) {
          arr.length = 0;
          return;
        }
      }
      if (typeof val === "object" && val) {
        for (const key in val) {
          const value = val[key];
          arr.push(value);
          path_array.push([...path_array[index], key]);
        }
      }
    }

    arr.splice(index, 1);
    path_array.splice(index, 1);
  }
}

function values(obj) {
  const output: unknown[] = [];
  for (const key in obj) {
    output.push(obj[key]);
  }
  return output;
}

// function entries (obj){
//   const output = [];
//   for(const key in obj){
//     output.push(key);
//   }
//   return output;
// }

// @ts-ignore
window.sfv = search_for_value;
// @ts-ignore
window.msfv = mild_search_for_value;

// search object for key containing a string, sadly won't return object path
function go_through(obj: { [key: string]: any }, needle: string) {
  const seen = new Set<any>();
  const stack = Object.entries(obj);
  for (let i = 0; i < stack.length; i++) {
    const [key, value] = stack[i];
    if (seen.has(value)) {
      continue;
    }
    seen.add(value);
    if (typeof value === "object" && value) {
      stack.push(...Object.entries(value));
    }
    const lower = key.toLowerCase();
    if (lower.includes(needle)) {
      console.log("Found", key, value);
    }
  }
}
