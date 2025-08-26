import { Safepay } from "@sfpy/node-core";

const safepay = new Safepay("66d4c1404a5bf63955c32483deb10644b004b1b02a9b87ec44eb5ed8326f2fcb", {
    authType: "secret", // either 'jwt' or 'secret' depending on what you provide
    host: "https://api.getsafepay.com", // can be configured to our sandbox host for test transactions
    
  });



export default safepay;
