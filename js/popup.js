/**
 * Popup window's code.
 *
 * @author Serdar Kuzucu
 */
$(function() {
	// the application scope
	var app = {};
	
	/**
	 * saved states array for fast access
	 * normally, they are stored in chrome.storage.sync
	 */
	app.savedStates = null;
	
	/**
	 * for fast access to item currently being renamed
	 */
	app.currentEditInput = null;
	app.currentEditIndex = -1;
	
	/**
	 * initializes the popup window.
	 * reads the data from chrome.storage.sync and prepares the UI
	 */
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
	
	/**
	 * Remove everything, clear all saved states.
	 */
	app.clearArchive = function () {
		app.savedStates = [];
		app.saveStorage();
		app.refreshUI();
	};
	
	/**
	 * Save app.savedStates to chrome.storage.sync
	 */
	app.saveStorage = function () {
		chrome.storage.sync.set({'savedStates': app.savedStates}, function() {
			// console.log("OK, sync!");
		});
	};
	
	/**
	 * hide state table and show 'no state found' text or vice-versa
	 */
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
	
	/**
	 * Clear the popup window and re-create UI
	 */
	app.refreshUI = function () {
		var table = $("#thetable").html("");
		
		app.switchContents();
		
		for (var i = 0; i < app.savedStates.length; i++) {
			var tr = app.createArchiveRow(app.savedStates[i]);
			table.append(tr);
		}
	};
	
	/**
	 * Creates DOM element for a.openTabs
	 * The link of state which opens all tabs in that state
	 */
	app.createOpenTabsAnchor = function (name) {
		var openTabsA = $('<a href="#" class="openTabs"></a>').html(name);
		openTabsA.attr("title", name + "\nClick to open that state.\nThis won't close your current tabs. We'll open a new window.");
		return openTabsA;
	};
	
	/**
	 * Create DOM elements for a state row
	 */
	app.createArchiveRow = function (state) {
		var tr = $('<tr class="warning"></tr>');
		
		// Remove button
		var removeBtn = $('<button class="btn btn-danger removeArchive"><i class="icon-trash icon-white"></i></button>');
		removeBtn.attr("title", "Remove Archive\nClick to remove that archive!\nThis operation cannot be undone!");
		
		// Rename button
		var renameBtn = $('<button class="btn btn-success renameArchive"><i class="icon-edit icon-white"></i></button>');
		renameBtn.attr("title", "Rename Archive\nRename this archive to remember what tabs are in it when you look at it.");
		
		// Override and Update button
		var overrideBtn = $('<button class="btn btn-warning overrideAndUpdate"><i class="icon-fire icon-white"></i></button>');
		overrideBtn.attr("title", "Override and Update\nUpdate this archive's content with current open tabs. This operation doesn't close your open tabs.");
		
		var openTabsA = app.createOpenTabsAnchor(state.name);
		var dateP = $('<p class="dateP"></p>').html(app.date(new Date(state.date)));
		
		$('<td class="editable"></td>').append(openTabsA).append(dateP).appendTo(tr);
		$('<td class="short-td"></td>').append(renameBtn).append('&nbsp;').append(overrideBtn).append('&nbsp;').append(removeBtn).appendTo(tr);
		return tr;
	};
	
	/**
	 * Callback function for save and close button click
	 */
	app.onSaveAndCloseClick = function() {
		chrome.tabs.query({currentWindow: true}, app.saveAndCloseTabs);
		return false;
	};
	
	/**
	 * Process tabs passed as an argument, save them, and close them.
	 */
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
	
	/**
	 * Callback function for remove state button in state table
	 */
	app.removeArchive = function () {
		var tr = $(this).closest('tr');
		var index = tr.index('tr');
		app.savedStates.splice(index, 1);
		app.saveStorage();
		
		tr.remove();
		
		app.switchContents();
	};
	
	/**
	 * If a state is being renamed, finishes rename process.
	 * Saves the new name of that state
	 */
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
	
	/**
	 * Callback function to handle rename button click
	 * Replaces the state name with an input field to rename it.
	 */
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
	
	/**
	 * Callback function to handle override and update button click
	 * Replaces a state's tabs with currently open tabs
	 */
	app.overrideAndUpdate = function () {
		app.closeIfInputOpen();
		
		var tr = $(this).closest('tr');
		var index = tr.index('tr');
		
		var currentState = app.savedStates[index];
		currentState.tabs = [];
		
		chrome.tabs.query({currentWindow: true}, function (tabs) {
			for (var i = 0; i < tabs.length; i++) {
				var tab = tabs[i];
				currentState.tabs.push({url: tab.url});
			}
			currentState.date = (new Date()).getTime();
			app.saveStorage();
		});
	};
	
	/**
	 * Callback function to handle open all tabs link click
	 * Open all tabs in a specific state.
	 */
	app.openAllTabs = function () {
		var tr = $(this).closest('tr');
		var index = tr.index('tr');
		
		var state = app.savedStates[index];
		var urls = [];
	
		for (var i = 0; i < state.tabs.length; i++) {
			urls.push(state.tabs[i].url);
		}
		
		// This job is hard to do in popup
		// so we kindly ask background page to do it.
		chrome.runtime.sendMessage({fn: "openTabs", urls: urls});
		return false;
	};
	
	/**
	 * Month names for date parsing
	 */
	app.months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
	
	/**
	 * Converts a given Date object to a readable string.
	 */
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

	/**
	 * Run app and bind listeners.
	 */
	app.initialize();
	$("#saveClose").click(app.onSaveAndCloseClick);
	$("#clearAll").click(app.clearArchive);
	$(document).on('click', '.removeArchive', app.removeArchive);
	$(document).on('click', '.renameArchive', app.showRenameInput);
	$(document).on('click', '.overrideAndUpdate', app.overrideAndUpdate);
	$(document).on('click', '.openTabs', app.openAllTabs);
	$(document).on('keyup', 'input.edit-input', function(e) {
		if (e.which == 13) {
		    app.closeIfInputOpen();
		}
	});
});
