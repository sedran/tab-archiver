var bgapp = {};

bgapp.openTabs = function (request) {
	chrome.windows.create({url: request.urls, type: 'normal', focused: true}, function (mw) {
		chrome.windows.update(mw.id, {state: 'maximized'});
	});
};

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.fn && typeof bgapp[request.fn] === 'function') {
		bgapp[request.fn](request);
	}
});
