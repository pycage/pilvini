# Shellfish HTML5 UI

Shellfish is a JQuery-based modern client-side UI framework for HTML5 application development.


## Components

Shellfish consists of several components that make up the complete package.

### Style

This component consists of the CSS files that provide the look of the user interface.

### Assets

This component consists of graphical assets for styling the user interface.

### Core

This component consists of the Javascript libraries of the Shellfish API.



## API Levels

Shellfish is divided into several levels of API.

### Low-Level Interface

The low-level interface provides functions that operate directly on HTML
elements and the DOM.

Code example:

    var page = $(
        sh.tag("div").class("sh-page")
        .content(
            sh.tag("h1").content("My Awesome Page")
        )
        .content(
            sh.tag("h2").content("Powered by Shellfish!")
        )
        .html()
    );
    sh.pagePush(page, function ()
    {
        console.log("The page was pushed.");
    });

### Mid-Level Interface

The mid-level interface provides UI elements that hide the underlying HTML elements.
On this level you work with element instances and properties. Extending the mid-level
with new elements is easy and straight-forward.

The mid-level is comparable to what you are used to from classic desktop UI toolkits.

Code example:

    var pageHeader = new sh.PageHeader();
    pageHeader.title = "My Awesome Page";
    pageHeader.subtitle = "Powered by Shellfish!";

    var btn = new sh.Button();
    btn.text = "Click Me!";
    btn.onClicked = function ()
    {
        console.log("The button was clicked.");
    };
    pageHeader.right = btn;

    var page = new sh.Page();
    page.header = pageHeader;

    page.push(function ()
    {
        console.log("The page was pushed.");
    });

### High-Level Interface

The high-level interface provides tools for declarative programming. It builds upon
the mid-level elements adding declarative components such as bindings and predicates.

Code example:

    var title = sh.binding("My Awesome Page");

    var page = sh.element(sh.Page)
    .header(
        sh.element(sh.PageHeader).id("header")
        .title(title)
        .subtitle("Powered by Shellfish!")
        .right(
            sh.element(sh.Button).text("Click Me!")
            .onClicked(function ()
            {
                console.log("The button was clicked!");
                title.assign("Shellfish rules!");
                page.find("header").subtitle("This is great!");
            })
        )
    )
    .add(
        sh.element(sh.Label)
        .text(sh.predicate([title], function ()
        {
            return "The page title currently says: " + title.value();
        }))
    );

    page.get().push(function ()
    {
        console.log("The page was pushed.");
    });


## Getting Started

Load `style/shellfish.css` as stylesheet and `jquery-<version>.min.js` and `core/low.js`
before your own scripts. For the mid-level API, load `core/mid.js` as well. For the
high-level API, load `core/high.js` in addition to the others.