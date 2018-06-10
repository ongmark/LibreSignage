const SLIDELIST_UPDATE_INTERVAL = 60000;

const DIALOG_MARKUP_TOO_LONG = (max) => {
	return new Dialog(
		DIALOG.ALERT,
		'Too long slide markup',
		`The slide markup is too long. The maximum length is
		${max} characters.`,
		null
	);
}

const DIALOG_SLIDE_NOT_SAVED = (callback) => {
	return new Dialog(
		DIALOG.CONFIRM,
		'Slide not saved',
		'The current slide is not saved yet. All changes ' +
		'will be lost if you continue. Are you sure you want ' +
		'to continue?',
		callback
	);
}

// Some sane default values for new slides.
const NEW_SLIDE_DEFAULTS = {
	'id': null,
	'name': 'NewSlide',
	'owner': null,
	'time': 5000,
	'markup': '',
	'index': 0,
	'enabled': true
};

const SLIDE_SAVE = $("#btn-slide-save");
const SLIDE_REMOVE = $("#btn-slide-remove");
const SLIDE_NAME = $("#slide-name");
const SLIDE_NAME_GRP = $("#slide-name-group");
const SLIDE_OWNER = $("#slide-owner");
const SLIDE_TIME = $("#slide-time");
const SLIDE_TIME_GRP = $("#slide-time-group");
const SLIDE_INDEX = $("#slide-index");
const SLIDE_INDEX_GRP = $("#slide-index-group");
const SLIDE_EN = $("#slide-enabled");
const EDITOR_STATUS = $("#editor-status");
var SLIDE_INPUT = null;

var name_sel = null;
var index_sel = null;

var _selected_slide = null;

function set_editor_status(str) {
	EDITOR_STATUS.text(str);
}

function set_editor_inputs(slide) {
	/*
	*  Display the data of 'slide' on the editor inputs.
	*/
	if (!slide) {
		SLIDE_INPUT.setValue('');
		SLIDE_NAME.val('');
		SLIDE_OWNER.val('');
		SLIDE_TIME.val(1);
		SLIDE_INDEX.val('');
		SLIDE_EN.prop('checked', false);
	} else {
		SLIDE_INPUT.setValue(slide.get('markup'));
		SLIDE_NAME.val(slide.get('name'));
		SLIDE_OWNER.val(slide.get('owner'));
		SLIDE_TIME.val(slide.get('time')/1000);
		SLIDE_INDEX.val(slide.get('index'));
		SLIDE_EN.prop('checked', slide.get('enabled'));
	}
	SLIDE_INPUT.clearSelection(); // Deselect new text.
}

function selected_slide_is_modified() {
	/*
	*  Check whether the selected slide has been modified and
	*  return true in case it has been modified. False is returned
	*  otherwise.
	*/
	if (_selected_slide == null) {
		return false;
	}

	if (SLIDE_INPUT.getValue() != _selected_slide.get('markup')) {
		return true;
	}
	if (SLIDE_NAME.val() != _selected_slide.get('name')) {
		return true;
	}
	if (SLIDE_OWNER.val() != _selected_slide.get('owner')) {
		return true;
	}
	if (SLIDE_TIME.val() != _selected_slide.get('time')/1000) {
		return true;
	}
	if (SLIDE_INDEX.val() != _selected_slide.get('index')) {
		return true;
	}
	if (SLIDE_EN.prop('checked') != _selected_slide.get('enabled')) {
		return true;
	}
	return false;
}

function disable_editor_controls() {
	SLIDE_INPUT.setReadOnly(true);
	SLIDE_NAME.prop("disabled", true);
	SLIDE_TIME.prop("disabled", true);
	SLIDE_INDEX.prop("disabled", true);
	SLIDE_SAVE.prop("disabled", true);
	SLIDE_REMOVE.prop("disabled", true);
	SLIDE_EN.prop("disabled", true);

	// Make sure the ValidatorSelectors don't enable the save button.
	name_sel.disable();
	index_sel.disable();
}

function enable_editor_controls() {
	SLIDE_INPUT.setReadOnly(false);
	SLIDE_NAME.prop("disabled", false);
	SLIDE_TIME.prop("disabled", false);
	SLIDE_INDEX.prop("disabled", false);
	SLIDE_SAVE.prop("disabled", false);
	SLIDE_REMOVE.prop("disabled", false);
	SLIDE_EN.prop("disabled", false);

	name_sel.enable();
	index_sel.enable();
}

function slide_show(slide) {
	/*
	*  Show the slide 'slide'.
	*/
	var cb = function(status, val) {
		if (!status) {
			return;
		}

		console.log("LibreSignage: Show slide '" + slide + "'");
		_selected_slide = new Slide();
		_selected_slide.load(slide, function(ret) {
			if (ret) {
				console.log("LibreSignage: API error!");
				set_editor_status(
					"Failed to load slide!"
				);
				set_editor_inputs(null);
				disable_editor_controls();
				return;
			}
			set_editor_inputs(_selected_slide);
			enable_editor_controls();
		});
	}

	if (selected_slide_is_modified()) {
		DIALOG_SLIDE_NOT_SAVED(cb).show();
	} else {
		cb(true, null);
	}
}

function slide_rm() {
	/*
	*  Remove the selected slide.
	*/
	if (!_selected_slide) {
		dialog(DIALOG.ALERT,
			"Please select a slide",
			"Please select a slide to remove first.",
			null
		);
		return;
	}

	set_editor_status("Deleting slide...");
	dialog(DIALOG.CONFIRM,
		"Delete slide?",
		"Are you sure you want to delete slide '" +
		_selected_slide.get("name") + "'.", (status, val) => {
		if (!status) {
			return;
		}
		_selected_slide.remove(null, (stat) => {
			if (api_handle_disp_error(stat)) {
				set_editor_status(
					"Failed to remove slide!"
				);
				return;
			}

			var id = _selected_slide.get('id');
			$('#slide-btn-' + id).remove();

			console.log(
				"LibreSignage: Deleted slide '" +
				_selected_slide.get('id') +
				"'."
			);

			_selected_slide = null;

			slidelist_trigger_update();
			set_editor_inputs(null);
			disable_editor_controls();
			set_editor_status("Slide deleted!");
		});
	});
}

function slide_new() {
	/*
	*  Create a new slide. Note that this function doesn't save
	*  the slide server-side. The user must manually save the
	*  slide afterwards.
	*/
	var cb = function(status, val) {
		if (status) {
			console.log("LibreSignage: Create slide!");
			set_editor_status("Creating new slide...");

			_selected_slide = new Slide();
			_selected_slide.set(NEW_SLIDE_DEFAULTS);

			set_editor_inputs(_selected_slide);
			enable_editor_controls();

			/*
			*  Leave the remove button disabled since the
			*  new slide is not saved yet and can't be
			*  removed.
			*/
			SLIDE_REMOVE.prop('disabled', true);

			set_editor_status("Slide created!");
		}
	};

	if (selected_slide_is_modified()) {
		DIALOG_SLIDE_NOT_SAVED(cb).show();
	} else {
		cb(true, null);
	}

}

function slide_save() {
	/*
	*  Save the currently selected slide.
	*/
	console.log("LibreSignage: Save slide");
	set_editor_status("Saving...");

	if (SLIDE_INPUT.getValue().length >
		SERVER_LIMITS.SLIDE_MARKUP_MAX_LEN) {

		DIALOG_MARKUP_TOO_LONG(
			SERVER_LIMITS.SLIDE_MARKUP_MAX_LEN
		).show();
		set_editor_status("Save failed!");
		return;
	}

	_selected_slide.set({
		'name': SLIDE_NAME.val(),
		'time': parseInt(SLIDE_TIME.val())*1000,
		'index': parseInt(SLIDE_INDEX.val()),
		'markup': SLIDE_INPUT.getValue(),
		'enabled': SLIDE_EN.prop('checked')
	});

	_selected_slide.save((stat) => {
		if (api_handle_disp_error(stat)) {
			set_editor_status("Save failed!");
			return;
		}
		console.log(
			"LibreSignage: Saved slide '" +
			_selected_slide.get("id") + "'."
		);
		set_editor_status("Saved!");

		/*
		*  Make sure the Remove button is enabled. This
		*  is needed because the New button enables all other
		*  editor controls except the Remove button.
		*/
		SLIDE_REMOVE.prop('disabled', false);
		slidelist_trigger_update();
	});
}

function slide_preview() {
	/*
	*  Preview the current slide in a new window.
	*/
	if (_selected_slide && _selected_slide.get('id')) {
		if (_selected_slide.get('id') != "__API_K_NULL__") {
			window.open("/app/?preview=" +
				_selected_slide.get('id'));
		} else {
			dialog(DIALOG.ALERT, "Please save the slide first",
				"Slides can't be previewed before they " +
				"are saved.", null);
		}
	} else {
		dialog(DIALOG.ALERT, "No slide selected",
			"Please select a slide to preview or " +
			"save the current slide first.", null);
	}
}

function editor_setup() {
	setup_defaults();

	name_sel = new ValidatorSelector(
		SLIDE_NAME,
		SLIDE_NAME_GRP,
		[new StrValidator({
			min: 1,
			max: SERVER_LIMITS.SLIDE_NAME_MAX_LEN,
			regex: null
		}, "The name is too short or too long."),
		new StrValidator({
			min: null,
			max: null,
			regex: /^[A-Za-z0-9_-]*$/
		}, "The name contains invalid characters.")]
	);
	index_sel = new ValidatorSelector(
		SLIDE_INDEX,
		SLIDE_INDEX_GRP,
		[new NumValidator({
			min: 0,
			max: SERVER_LIMITS.SLIDE_MAX_INDEX,
			nan: false,
			float: true
		}, "The index is outside the accepted bounds."),
		new NumValidator({
			min: null,
			max: null,
			nan: true,
			float: false
		}, "The index must be an integer value.")]
	);

	val_trigger = new ValidatorTrigger(
		[name_sel, index_sel],
		(valid) => {
			SLIDE_SAVE.prop('disabled', !valid);
		}
	);

	/*
	*  Add a listener for the 'beforeunload' event to make sure
	*  the user doesn't accidentally exit the page and lose changes.
	*/
	window.addEventListener('beforeunload', function(e) {
		if (!selected_slide_is_modified()) {
			return;
		}

		e.returnValue = "The selected slide is not saved. " +
				"Any changes will be lost if you exit " +
				"the page. Are you sure you want to " +
				"continue?";
		return e.returnValue;
	});

	/*
	*  Setup the ACE editor with the Dawn theme
	*  and plaintext mode.
	*/
	SLIDE_INPUT = ace.edit('slide-input');
	SLIDE_INPUT.setTheme('ace/theme/dawn');
	SLIDE_INPUT.$blockScrolling = Infinity;

	// Disable inputs initially and setup update intevals.
	disable_editor_controls();
	slidelist_trigger_update();
	setInterval(
		slidelist_trigger_update,
		SLIDELIST_UPDATE_INTERVAL
	);
}

api_init(
	null,	// Use default config.
	editor_setup
)
