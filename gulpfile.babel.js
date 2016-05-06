'use strict';
// babel            - For ES2015 compiling
// twig             - twig parser
// sass             - SASS parser
// yamljs           - YAML files parser
// del              - Files remove
// imageminPngquant - Lossy compression of PNG images
// browserSync      - Browser synchronization
// htmlmin          - html minimization
// cleanCss         - CSS minimization
// uglify           - js minimization
// svgmin           - svg minimization
// imagemin         - Image minimization
// autoprefixer     - Automatic adding prefix for CSS rules
// svgstore         - svg concatenation into symbol tags
// rename           - File rename (for svg's id's)
// sourcemaps       - Source maps for SASS

const cdir = 'config.yml',
    gulp = require('gulp'),
    YAML = require('yamljs');
var conf = YAML.load(cdir), $ = {}, dest = {}, src = {}, watch = {}, data = {}, plg  = {};

Object.keys(require('./package.json').devDependencies).forEach((pkg) => {
    $[pkg.replace('gulp-', '').replace(/-[a-z]/g, (_, ofs, str) => {
        return str[++ofs].toUpperCase();
    })] = require(pkg);
});

function cinit(done) {
    conf  = YAML.load(cdir);
    data  = conf.prj;
    plg   = conf.plg;
    dest  = conf.dir.dest;
    src   = conf.dir.src;
    watch = Object.assign({}, src, conf.dir.watch);
    done();
}

cinit(function() {});

function go() { return require("through2").obj(function (file, enc, cb) { cb(null, file); }); }
function no(done) { done(); }
function reload(done) { $.browserSync.reload(); done(); }

// SVG BUILD TASK
gulp.task('build:svg', (done) => {
    gulp.src(src.svg)
        .pipe(data.mcb.svg[0] ? $.svgmin() : go())
        .pipe($.rename(function (path) { // Rename files for beauty id's
            let name = path.dirname.split(path.sep);
            name[0] == '.' ? name.shift() : true;
            name.push(path.basename);
            path.basename = name.join('-');
        }))
        .pipe($.svgstore({ inlineSvg: true })) // svg concatenation into symbols
        .pipe(gulp.dest(dest.svg));
    done();
});

// HTML BUILD TASK
gulp.task('build:html', (done) => {
    gulp.src(src.html)
        .pipe(data.pre.html ? $[data.pre.html]({data: data}) : go())
        .pipe(data.mcb.html[0] ? $.htmlmin({collapseWhitespace: true}) : go())
        .pipe(gulp.dest(dest.html));
    done();
});

// IMAGE BUILD TASK
gulp.task('build:img', (done) => {
    gulp.src(src.img)
        .pipe(data.mcb.img[0] ? $.imagemin({
            progressive: true,
            svgoPlugins: [{ removeViewBox: false }],
            use: [$.imageminPngquant()],
            interlaced: true
        }) : go())
        .pipe(gulp.dest(dest.img));
    done();
});

// CSS BUILD TASK
gulp.task('build:css', (done) => {
    gulp.src(src.css)
        .pipe($.sourcemaps.init())
        .pipe(data.pre.css ? $[data.pre.css](data.preOpt[data.pre.css]).on('error', $[data.pre.css].logError) : go())
        .pipe($.autoprefixer(plg.autoprefixer))
        .pipe(data.mcb.css[0] ? $.cleanCss() : go())
        .pipe($.sourcemaps.write(dest.srcMap))
        .pipe(gulp.dest(dest.css));
    done();
});

// JS BUILD TASK
gulp.task('build:js', (done) => {
    gulp.src(src.js)
        .pipe($.sourcemaps.init())
        .pipe(data.pre.js ? $[data.pre.js](data.preOpt[data.pre.js]) : go())
        .pipe(data.mcb.js[0] ? $.uglify() : go())
        .pipe($.sourcemaps.write(dest.srcMap))
        .pipe(gulp.dest(dest.js));
    done();
});

// CLEAN TASK
gulp.task('clean', (done) => {
    let arr = data.mcb, out = [];
    for (let key in arr) {
        if (arr.hasOwnProperty(key)) {
            arr[key][1] ? out.push(dest[key]) : 0;
        }
    }
    $.del(out, plg.del);
    done();
});

// BUILD TASK
gulp.task('build', gulp.series(gulp.parallel(
    data.mcb.css [2] ? 'build:css'  : no,
    data.mcb.js  [2] ? 'build:js'   : no,
    data.mcb.svg [2] ? 'build:svg'  : no,
    data.mcb.img [2] ? 'build:img'  : no),
    data.mcb.html[2] ? 'build:html' : no));

// SERVER AND BROWSER TASK
gulp.task('sync', (done) => {
    $.browserSync.init(plg.browserSync);
    done();
});

// WATCH TASK
gulp.task('watch', (done) => {
    gulp.watch(watch.html, gulp.series('build:html',   reload));
    gulp.watch(watch.css,  gulp.series('build:css',    reload));
    gulp.watch(watch.js,   gulp.series('build:js',     reload));
    gulp.watch(watch.svg,  gulp.series('build:svg',    reload));
    gulp.watch(watch.img,  gulp.series('build:img',    reload));
    gulp.watch(cdir,       gulp.series(cinit, 'build', reload));
    done();
});

// DEFAULT TASK
gulp.task('default', gulp.parallel(gulp.series('build', 'sync'), 'watch'));
