'use strict';
var gulp = require('gulp');

gulp.task('common', ['css', 'js']);

gulp.task('default', ['common']);

gulp.task('css', function() {
	var concat = require('gulp-concat');
	var postcss = require('gulp-postcss');
	var autoprefixer = require('autoprefixer');
	// var sourcemaps   = require('gulp-sourcemaps');

	var files = [
		'css/base.css',
		'css/buttons.css',
		'css/area_button.css',
		'css/master.css',
		'css/view_switcher.css',
		'css/vkontakte_switcher.css',
		'css/search_results.css',
		'css/player.css',
		'css/buttmen.css',
		'css/play-list-panel.css',
		'css/abs_layout.css',
		'css/pv-layout.css'
	];

	return gulp.src(files)
		// .pipe(sourcemaps.init())
		.pipe( postcss([
			require('./dev/svg-mod')(),
			autoprefixer({ browsers: ['> 1%', 'opera 12'] })
		]) )
		.pipe(concat('combined.css'))
		// .pipe(sourcemaps.write('.'))
		.pipe(gulp.dest('dist/'));
});

gulp.task('js', function() {
	var rjs = require('gulp-requirejs-optimize');
	// var sourcemaps = require('gulp-sourcemaps');

	var optimizerOptions = {
		packages: [
			{
				name: 'pv',
				location: 'js/libs/provoda',
				main: 'provoda'
			}
		],
		paths: {
			spv: 'js/libs/spv',
			su: 'js/seesu',
			jquery: 'js/common-libs/jquery-2.1.4.min',
			localizer: 'js/libs/localizer',
			cache_ajax: 'js/libs/cache_ajax',
			app_serv: "js/app_serv",
			view_serv: "js/views/modules/view_serv",
			env: "js/env",
			hex_md5: 'js/common-libs/md5.min',
		},
		shim: {
			hex_md5: {
				exports: 'hex_md5'
			}
		}
	};

	return gulp.src('loader.js')
		// .pipe(sourcemaps.init())
		.pipe(rjs(optimizerOptions))
		// .pipe(sourcemaps.write('.'))
		.pipe(gulp.dest('dist'));
});

combo('webapp', extend(common('webapp'), {
	'index': patch(
		'index.html', './src/webapp/index.html.patch',
		'dist-envs/webapp')
}));

combo('chrome_popup', chromeExtension('chrome_popup'));
combo('opera_popup', extend(chromeExtension('opera_popup'), {
	'config.xml': copy(
		'./src/opera_popup/config.xml',
		'dist-envs/' + 'opera_popup'
	),
	'background': copy(
		'./src/opera_popup/bg.html', 
		'dist-envs/' + 'opera_popup'
	),
	'js': copy('js/**/*', 'dist-envs/' + 'opera_popup' + '/js'),
	'js-loader': copy(
		'./loader.js', 
		'dist-envs/' + 'opera_popup'
	),
}));

function chromeExtension(dest_env) {
	var dest_folder = 'dist-envs/' + dest_env;
	return extend(common(dest_env), {
		'index': patch(
			'index.html', './src/chrome_popup/index.html.patch',
			dest_folder),
		'manifest': patch(
			'manifest.json', './src/chrome_popup/manifest.json.patch',
			dest_folder),
		'locales-en': patch(
			'./_locales/en/messages.json',
			'./src/chrome_popup/_l-en-messages.json.patch',
			dest_folder + '/_locales/en/'
		),
		'locales-ru': patch(
			'./_locales/ru/messages.json',
			'./src/chrome_popup/_l-ru-messages.json.patch',
			dest_folder +'/_locales/ru/'
		),

		icons: copy('icons/**/*', dest_folder + '/icons'),

		'background': copy('./src/chrome_popup/bg.html', dest_folder),
		'ui-init': copy('./src/chrome_popup/ui-init.js', dest_folder),

		// ''
		/*

		index.html
		manifest.json
		/_locales/en/messages.json
		_locales/ru/messages.json

		bg.html
		ui-init.js	
		
		*/
	});
}

function patch(source, patch_path, dest) {
	return function() {
		var patch = require('./dev/gulp-patch.js');

		return gulp.src(source)
			.pipe(patch(patch_path))
			.pipe(gulp.dest(dest));
	};
}

function copy(source, dest) {
	return function() {
		return gulp.src(source)
			.pipe(gulp.dest(dest));
	};
}

function common(env) {
	return {
		css: [['css'],
			copy('dist/combined.css', 'dist-envs/' + env + '/dist')],
		js: [['js'], 
			copy('dist/loader.js', 'dist-envs/' + env + '/dist')],
		images: copy('i/**/*', 'dist-envs/' + env + '/i'),
		'js-sep': copy('js-sep/**/*', 'dist-envs/' + env + '/js-sep')
	};
}

function combo(task, deps) {
	var array = [];

	for (var name in deps) {
		var task_name = task + '-' + name;
		var value = deps[name];
		if (Array.isArray(value)) {
			gulp.task(task_name, value[0], value[1]);
		} else {
			gulp.task(task_name, value);
		}
		array.push(task_name);
	}

	gulp.task(task, array);
}

function extend(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || typeof add !== 'object') return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
}

gulp.task('pvclass', function() {
	var posthtml = require('./dev/gulp-posthtml');
	var pvclass = require('./dev/gulp-posthtml-pvclass.js');

	return gulp.src('index.html')
		// .pipe(sourcemaps.init())
		.pipe(posthtml([pvclass()]))
		// .pipe(sourcemaps.write('.'))
		.pipe(gulp.dest('dev-dist'));
});