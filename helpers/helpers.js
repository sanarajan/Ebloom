// helpers.js (or any appropriate file name)
const handlebars = require("handlebars");
const moment = require("moment");

handlebars.registerHelper(
  "ternary",
  function (condition, trueValue, falseValue) {
    return condition ? trueValue : falseValue;
  }
);
handlebars.registerHelper("eq", function (arg1, arg2) {
  if (typeof arg1 === "boolean" || typeof arg2 === "boolean")
    return arg1 === arg2;
  else {
    // Check if either argument is undefined or null
    if (
      arg1 === undefined ||
      arg1 === null ||
      arg2 === undefined ||
      arg2 === null
    ) {
      return false;
    }

    // Convert both arguments to strings for comparison
    return arg1.toString() === arg2.toString();
  } // Ensure comparison as strings to handle ObjectId comparison
});

handlebars.registerHelper("getArrayElement", function (array, index) {
  return array[index];
});
//for change value of @index
handlebars.registerHelper("add", function (value, addition) {
  return value + addition;
});

handlebars.registerHelper("checkAuth", function (user, options) {
  if (user && user.useremail) {
    return options.fn(this); // User is authenticated
  } else {
    return options.inverse(this); // User is not authenticated
  }
});
//pagination
handlebars.registerHelper("getArrayElement", function (array, index) {
  return array[index];
});

handlebars.registerHelper("add", function (value, addition) {
  return value + addition;
});

// New helpers for pagination
handlebars.registerHelper("range", function (start, end) {
  return Array.from({ length: end - start + 1 }, (v, k) => k + start);
});
handlebars.registerHelper("subtract", function (value, subtrahend) {
  return value - subtrahend;
});

handlebars.registerHelper("gt", function (value, compare) {
  return value > compare;
});

handlebars.registerHelper("lt", function (value, compare) {
  return value < compare;
});
handlebars.registerHelper("gte", function (value, compare) {
  return value >= compare;
});
//pagination end
// handlebars.registerHelper('json', function(context) {
//   return JSON.stringify(context);
// });
handlebars.registerHelper("getArrayElement", function (array, index) {
  return array[index] || "No image available";
});
handlebars.registerHelper("json", function (context) {
  return JSON.stringify(context, null, 2);
});

handlebars.registerHelper("formatDate", function (dateString) {
  // Use moment.js to format the date
  return moment(dateString).format("DD/MM/YY");
});
handlebars.registerHelper("statusColor", function (orderStatus) {
  switch (orderStatus) {
    case "Shipped":
      return "orange";
    case "Delivered":
      return "green";
    case "Cancelled":
      return "red";
    default:
      return "";
  }
});
handlebars.registerHelper("isHalf", function (rating) {
  return rating % 1 !== 0;
});

handlebars.registerHelper("dateCaldaerFormate", function (dateString) {
  // Use moment.js to format the date
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
});
handlebars.registerHelper("ifEquals", function (arg1, arg2, options) {
  return arg1 == arg2 ? options.fn(this) : options.inverse(this);
});
module.exports = handlebars;
