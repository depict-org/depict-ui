import { depict_overlay, modal_styling } from "../lib/templates/depict_modal";
import { observer, Tenant } from "@depict-ai/utilishared";

show_ovrl();
let busy = false;
async function show_ovrl() {
  console.log("initializing overlay");
  // @ts-ignore
  window.sd = () => document.querySelector("div.depict_modal.depict_hidden").scrollBy(0, 500);
  // @ts-ignore
  window.su = () => document.querySelector("div.depict_modal.depict_hidden").scrollBy(0, -500);
  await observer.wait_for_element("body");
  depict_overlay("init", {
    button_row: "",
    ...new Tenant({
      TENANT: "network_takeover",
      // @ts-ignore
      get_product_id: () => {},
      GA_ID: "",
    }),
    onshow: () => (busy = true),
    onhide: () => (busy = false),
  });
  document.body.appendChild(document.createElement("style")).append(
    modal_styling +
      `
    .depict_modal {
      z-index: 999999;
    }`
  );
}
const already_seen: string[] = [];
async function ga_dealwith(stuff) {
  // const obj = {};
  // stuff.forEach(line => {
  //   const s = line.split("=");
  //   obj[s[0]] = s[1];
  // });
  // console.info(obj);
  // let list = 1, listname = [], curr_listname;
  // while(curr_listname = obj['il' + list++ + 'nm']){
  //   listname.push(curr_listname)
  // }
  // listname = listname.join(", ");
  // alert(listname + "\n" + obj.pal + "\n" + obj.ea + "\n" + obj.t);
  while (busy) {
    await new Promise(r => setTimeout(r, 100));
  }
  const lemodal = await observer.wait_for_element(".depict_modal .inserthere");
  depict_overlay("show");
  lemodal.innerHTML = stuff.join("<br />");
  debugger;
  depict_overlay("hide");
}
function interceptor(url: Request | string, payload) {
  if (url instanceof Request) {
    url = url.url;
  }
  if (url.indexOf("collect") !== -1 && already_seen.indexOf(url) === -1) {
    // sometimes we get a request twice for some reason
    already_seen.push(url);
    let u_o: URL | undefined;
    try {
      if (url.startsWith("//")) {
        url = "https:" + url;
      }
      u_o = new URL(url);
    } catch (e) {
      console.log(e);
      debugger;
    }
    let split_params = u_o!.search
      .substr(1, u_o!.search.length - 1)
      .split("&")
      .map(v => {
        var a = v.split("=");
        a[1] = decodeURIComponent(a[1]);
        return a.join("=");
      });
    ga_dealwith(split_params);
  } else {
    // console.log({url, payload});
  }
}
imagefaker();
function imagefaker() {
  const NativeImage = Image;
  class Imag {
    constructor(...args) {
      const image = new NativeImage(...args);
      haxorize(image);
      return image;
    }
  }
  // @ts-ignore
  Imag.__proto__ = HTMLImageElement.prototype; // probably does nothing
  // @ts-ignore
  Image = Imag;
  const orig_ce = Document.prototype.createElement;
  Document.prototype.createElement = document.createElement = function (n) {
    if (n === "img") {
      var img = new NativeImage();
      haxorize(img);
      return img;
    } else {
      return orig_ce.apply(this, arguments);
    }
  };
}
function findDescriptor(obj, prop) {
  if (obj != null) {
    return Object.hasOwnProperty.call(obj, prop)
      ? Object.getOwnPropertyDescriptor(obj, prop)
      : findDescriptor(Object.getPrototypeOf(obj), prop);
  }
}
function haxorize(img) {
  // https://stackoverflow.com/a/38802602/10659982
  var { get, set } = findDescriptor(img, "src");

  Object.defineProperty(img, "src", {
    configurable: true,
    enumerable: true,

    //get: get,  //keep behaviour
    get() {
      //overwrite getter
      var v = get.call(this); //call the original getter
      // console.log("get src:", v, this);
      return v;
    },

    //same for setter
    set(v) {
      // dlog("set src:", v, this);
      interceptor(v, "");
      set.call(this, v);
    },
  });
}
const oldbeacon = Navigator.prototype.sendBeacon;
Navigator.prototype.sendBeacon = function () {
  // console.log("Sendbeacon called with args", ...arguments);
  interceptor(arguments[0], arguments[1]);
  return oldbeacon.apply(this, arguments);
};

const oldopen = window.XMLHttpRequest.prototype.open;
const oldsend = window.XMLHttpRequest.prototype.send;
window.XMLHttpRequest.prototype.open = function () {
  this._url = arguments[1];
  return oldopen.apply(this, arguments);
};
window.XMLHttpRequest.prototype.send = function () {
  // console.log("xhr request to", this._url, "with payload", arguments[0]);
  interceptor(this._url, arguments[0]);
  return oldsend.apply(this, arguments);
};
const oldfetch = window.fetch;
window.fetch = async function () {
  // console.log("fetch request made to", arguments[0], "payload", arguments[1]?.body);
  interceptor(arguments[0], arguments[1]?.body);
  const return_value = await oldfetch.apply(this, arguments);
  // const text = await return_value.text();
  // console.log("fetch request returned", text);
  // return_value.text = async () => text;
  // return_value.json = async () => JSON.parse(text);
  return return_value;
};
