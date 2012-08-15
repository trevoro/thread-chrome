var loadOptions = function() {
  var url = chrome.extension.getURL("lib/options/index.html"); 
  //chrome.tabs.create({ "index": tab.index + 1, "url": tabURL });
  chrome.tabs.create({ "url": url });
}

var logout = function() {
  alert("logging you out... (not really)");
}

document.getElementById("#options").on("click", loadOptions);
document.getElementById("#logout").on("click", logout);
