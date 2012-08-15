/*
 
 options 

*/

var OPTIONKEY = '_ebbOptions';
var options = {};
var defaultOptions = {
  username: null
};

var getValue = function(id) {
  var v = document.getElementById(id).value;
  console.log(v);
  return v;
}

var setValue = function(id, value) {
  document.getElementById(id).value = value;
}

var saveOptions = function() {
  options.username = getValue('username');

  localStorage[OPTIONKEY] = JSON.stringify(options);
};

var loadOptions = function() {
  var toParse = localStorage[OPTIONKEY] || defaultOptions;
  options = JSON.parse(toParse);
  setValue('username', options.username);
}

// bind to button click events
document.addEventListener('DOMContentLoaded', function() {
  loadOptions();
  document.getElementById('saveButton').addEventListener('click', saveOptions);
  document.getElementById('closeButton').addEventListener('click', function() {
    window.close();
  });
});
