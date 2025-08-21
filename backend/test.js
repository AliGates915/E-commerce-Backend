// test.js
import Safepay from "@sfpy/node-core";

const safepay = new Safepay("sec_07f70953-7684-41a1-b930-9d1497436084", {
  authType: "secret", // required
  host: "https://sandbox.api.getsafepay.com", // use sandbox for testing
});

async function run() {
  try {
    console.log("✅ Testing Safepay API...");

    const customer = await safepay.customers.object.create({
      first_name: "Ali",
      last_name: "Sohail",
      email: "ali@example.com",
      phone_number: "+923331234567",
      country: "PK",
      is_guest: false,
    });

    console.log("🎉 Customer created successfully!");
    console.log(customer.data); // full response
  } catch (error) {
    console.error("❌ Error:", error.message || error);
  }
}

run();
