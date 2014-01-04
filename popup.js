$(function() {
	
	var app = {};
	
	app.savedStates = null;
	
	app.currentEditInput = null;
	app.currentEditIndex = -1;
	
	app.initialize = function() {
		chrome.storage.sync.get('savedStates', function(resp) {
			if (resp.savedStates && resp.savedStates.length) {
				app.savedStates = resp.savedStates;
			} else {
				app.savedStates = [];
			}
			app.refreshUI();
		});
	};
	
	app.clearArchive = function () {
		app.savedStates = [];
		app.saveStorage();
		app.refreshUI();
	};
	
	app.saveStorage = function () {
		chrome.storage.sync.set({'savedStates': app.savedStates}, function() {
			console.log("OK, sync!");
		});
	};
	
	app.switchContents = function () {
		var table = $("#thetable");
		
		if (app.savedStates.length > 0) {
			table.show();
			$(".bottombar .text-error").hide();
		} else {
			table.hide();
			$(".bottombar .text-error").show();
		}
	};
	
	app.refreshUI = function () {
		var table = $("#thetable").html("");
		
		app.switchContents();
		
		for (var i = 0; i < app.savedStates.length; i++) {
			var tr = app.createArchiveRow(app.savedStates[i]);
			table.append(tr);
		}
	};
	
	app.createOpenTabsAnchor = function (name) {
		var openTabsA = $('<a href="#" class="openTabs"></a>').html(name);
		openTabsA.attr("title", "Click to open that state. This won't close your current tabs. We'll open a new window.");
		return openTabsA;
	};
	
	app.createArchiveRow = function (state) {
		var tr = $('<tr class="warning"></tr>');
		var removeBtn = $('<button class="btn btn-danger removeArchive"><i class="icon-trash icon-white"></i></button>');
		removeBtn.attr("title", "Click to remove that archive! This operation cannot be undone!");
		var renameBtn = $('<button class="btn btn-success renameArchive"><i class="icon-edit icon-white"></i></button>');
		renameBtn.attr("title", "Rename this archive to remember what tabs are in it when you look at it.");
		var openTabsA = app.createOpenTabsAnchor(state.name);
		var dateP = $('<p class="dateP"></p>').html(app.date(new Date(state.date)));
		
		$('<td class="editable"></td>').append(openTabsA).append(dateP).appendTo(tr);
		$('<td class="short-td"></td>').append(renameBtn).append('&nbsp;').append(removeBtn).appendTo(tr);
		return tr;
	};
	
	app.onSaveAndCloseClick = function() {
		chrome.tabs.query({currentWindow: true}, app.saveAndCloseTabs);
		return false;
	};
	
	app.saveAndCloseTabs = function(tabs) {
		var currentState = {name: "Untitled Tab List", tabs: []};
		var removeTabIds = [];
		
		for (var i = 0; i < tabs.length; i++) {
			var tab = tabs[i];
			currentState.tabs.push({url: tab.url});
			removeTabIds.push(tab.id);
		}
		
		currentState.date = (new Date()).getTime();
		
		app.savedStates.splice(0, 0, currentState);
		app.saveStorage();
		
		var tr = app.createArchiveRow(currentState);
		$("#thetable").prepend(tr);
		
		app.switchContents();
		
		if (app.currentEditIndex > -1) {
			app.currentEditIndex++;
		}
		
		chrome.tabs.create({active: true});
		chrome.tabs.remove(removeTabIds);
	};
	
	app.removeArchive = function () {
		var tr = $(this).closest('tr');
		var index = tr.index('tr');
		app.savedStates.splice(index, 1);
		app.saveStorage();
		
		tr.remove();
		
		app.switchContents();
	};
	
	app.closeIfInputOpen = function () {
		if (app.currentEditIndex > -1) {
			var val = app.currentEditInput.val();
			var a = app.createOpenTabsAnchor(val);
			app.currentEditInput.replaceWith(a);
			
			app.savedStates[app.currentEditIndex].name = val;
			app.saveStorage();
			
			app.currentEditIndex = -1;
			app.currentEditInput = null;
		}
	};
	
	app.showRenameInput = function () {
		app.closeIfInputOpen();
		
		var tr = $(this).closest('tr');
		var index = tr.index('tr');
		var a = tr.find('td.editable a.openTabs');
		var input = $('<input type="text" class="span3 edit-input" />').val(app.savedStates[index].name);
		a.replaceWith(input);
		
		app.currentEditInput = input;
		app.currentEditIndex = index;
		
		input.focus();
		input.select();
	};
	
	app.openAllTabs = function () {
		var tr = $(this).closest('tr');
		var index = tr.index('tr');
		
		var state = app.savedStates[index];
		var urls = [];
	
		for (var i = 0; i < state.tabs.length; i++) {
			urls.push(state.tabs[i].url);
		}
		
		chrome.runtime.sendMessage({fn: "openTabs", urls: urls});
		return false;
	};
	
	app.months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
	
	app.date = function (d) {
		var day = d.getDate();
		var month = app.months[d.getMonth()];
		var year = d.getFullYear();
		var h = d.getHours();
		var m = d.getMinutes();
		h = h < 10 ? "0" + h : h;
		m = m < 10 ? "0" + m : m;
		return month + ", " + day + " " + year + " " + h + ":" + m;
	};

	app.initialize();
	$("#saveClose").click(app.onSaveAndCloseClick);
	$("#clearAll").click(app.clearArchive);
	$(document).on('click', '.removeArchive', app.removeArchive);
	$(document).on('click', '.renameArchive', app.showRenameInput);
	$(document).on('click', '.openTabs', app.openAllTabs);
	$(document).on('keyup', 'input.edit-input', function(e) {
		if (e.which == 13) {
		    app.closeIfInputOpen();
		}
	});
});
