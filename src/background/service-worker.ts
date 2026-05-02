console.log("Markhive worker ready");

chrome.runtime.onInstalled.addListener(() => {
  console.log("Markhive worker installed");
});
