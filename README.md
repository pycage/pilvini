# pilvini
## X-Platform Personal Cloud Drive

> [Finnish]<br>
> **-ni** *(poss. suff.)* my ~<br>
> **pilvi** *(n.)* cloud<br>
> **pilvini** my cloud

*pilvini* is a cloud drive service implementing the WebDAV protoctol running on
Node.js. But this is not all: *pilvini* also features a fancy HTML5 web interface in case you cannot or want not use a WebDAV client.

The purpose of *pilvini* is to make your home filesystem accessible to you worldwide
in a secure way, SSL-encrypted and guarded by authorization.

*pilvini* runs on whatever platform Node.js is running.

## Features:

 * WebDAV Server
   * SSL-encrypted communication and HTTP authentication
   * Multiple users with various permissions
   * Securely exposes a subdirectory on the host's filesystem
   * Virtual file system
     * Archives (ZIP) are handled transparently as directories
     * Recursively open archives inside archives

 * Full-featured HTML5 web shell
   * For desktop, mobile, and TV screen
   * File operations (new file / directory, copy, rename, delete, upload, download)
   * Upload data by dragging files or directories from outside the browser window
   * Download directory hierarchies as ZIP files
   * Clipboard for moving / copying files
   * path breadcrumbs and favorites menu with bookmarked directories
   * Touchscreen gestures such as swipe back on mobile devices
   * Image preview and slideshow
   * Music playback
   * Video playback
   * File viewers for
     * text (with editing)
     * Markdown text (with editing)
     * PDF
     * image
     * video
   * Preview thumbnails for images, videos, and music files with embedded cover art
   * Create and revoke password-protected directory shares

## Requirements:

 * Node.js
 * jszip
 * lwip image processing library (optional, if you want to see image thumbnails in the web interface)

## Installation

Put the `pilvini` directory wherever you like and enter the directory.

Run

```
# npm install
```

to install the `lwip` image processing library and `jszip`.

## Configuration

*pilvini* is configured with a JSON file `config.json`. Copy the file
`config.json.example` over to `config.json` and modify it to your needs with a
text editor:

 * `server` This is the server configuration section.
   * `listen` This is the listening interface of the server. In most cases, the
     default value of `0.0.0.0` is just fine.
   * `port` This is the port where the server listens. Note that privileged
     ports (below 1024) are only available if *pilvini* is started as super-user
     (which we do not recommended).
   * `use_ssl` Set this value to `true` to enable SSL secure connections.
     For SSL, you will also have to supply a server certificate.
   * `ssl_certificate` The path to the SSL server certificate if SSL is enabled.
   * `ssl_key` The path to the SSL server private key if SSL is enabled.
   * `root` The root path served by *pilvini*. Files outside this path cannot be accessed by any user.

 * `authentication` This is the authentication configuration section.
   * `method` The HTTP authentication method to use. Either `basic` or `digest`.
   * `realm` The name of the HTTP authentication realm.

 * `users` This is the users configuration section. You can add as many users
   as you like.
   * `name` The login name of the user.
   * `password_hash` A MD5 hash of the user's login name, realm, and password.
     You can obtain one easily with `echo -n "<user>:<realm>:<password>" | md5sum`,
     or use an online MD5 hash generator, such as
     [http://www.adamek.biz/md5-generator.php].
   * `home` This is the path that *pilvini* confines the user to. This path is relative to the `root` path configured for the server.
   * `fingerprints` An optional list of fingerprints that may be used to identify the user. See **Login via Fingerprint** for details.
   * `permissions` A list of permissions given to the user. Available permissions are: `CREATE`, `DELETE`, `MODIFY`, `SHARE`, `ADMIN`.

 * `global` This is the section for global settings.
   * `debug` Set this value to true to enable verbose debug logging.

If you are giving other users access to *pilvini*, you should make sure that
none of them can access its `config.json` file. While the hashed passwords
cannot be used to reconstruct the password, it is possible to find a matching
string by brute-force or to construct one mathematically!

## Running

Start the server with
```
# node pilvini.js
```
and *pilvini* welcomes you and is ready for incoming connections:
```
                   | Version 0.1.0
   .-------.       |
  ( Pilvini ).--.  | (c) 2017 Martin Grimme
 (  Cloud Drive  ) | https://github.com/pycage/pilvini
  ```````````````  |
Listening....      | Port 7443 (SSL)
```

## Usage

After the *pilvini* server is started, you can use a WebDAV client to connect
to the port you configured and login as the user you configured.

To use the HTML5 shell, open the `/::shell/` document in a web browser supporting HTML5 (which is pretty much any recent browser).
```
https://<address>:<port>/::shell/
```

## Windows Explorer and WebDAV

While Windows Explorer theoretically supports the WebDAV protocol for mounting
remote shares, it is in practise very picky.

 * It will not accept a WebDAV server with a self-signed SSL certificate,
   unless that certificate has been added to Windows' trust store manually.

 * It will not accept a WebDAV server over plain HTTP (no SSL) with the basic
   authentication method. Configure the server to use the digest method instead,
   or use SSL.

 * It is very chatty and moving the mouse cursor over folders can cause a lot of
   network traffic.

 * For every request, it has to be reminded to send the authentication header.
   As a consequence of this it sends every request twice. First unauthorized,
   then authorized.

## Login via Fingerprint

Client fingerprints may be used as an alternative authentication method for password-less
user login. *pilvini* determines a unique fingerprint of the client and if the fingerprint
matches one in its registry of fingerprints, the user is authenticated automatically.
Users are allowed to have multiple fingerprints in the registry in order to give them access
from different clients.

There are two types of fingerprints. Address-bound fingerprints are tied to a certain IP address,
while roaming fingerprints are not tied to an IP address. Roaming fingerprints are useful for
mobile users which get new IP address often.

Watch the server log to find the normal and roaming fingerprints of a client connection.

**Note:** Clients identified by fingerprint cannot log out or log in to another user account.

**Note:** Fingerprint-based authentication may pose a security risk as it is not ruled out that
fingerprints (especially roaming fingerprints) can be spoofed with some effort. Do not configure
fingerprint login if you believe this could be a security issue.



## The Shell

![](apple-touch-icon.png)

The shell is *pilvini*'s snappy HTML5 web interface. Open the `/::shell/` document in a web browser and login with a user name and password.
```
https://<address>:<port>/::shell/
```

### Navigation

Click on a directory item to enter that directory. Click on a file to open it. Some file types (e.g. images) are opened directly without leaving the shell. The other types are opened by the browser's default handler.

#### Back Button and Touch Gesture

If you can go up to the parent directory, a back button appears at the left of the top bar. Click to go to the parent directory.

On a touch screen you can also swipe the page to the right to go to the parent directoy.

#### Path Menu

Click on the path name in the top bar to open the path menu.

There you will find a list of breadcrumbs to quickly jump to any parent directory of the current path.

Click on the **Favorites** sub menu and select **Add to Favorites** to add the current directory to your list of favorites in this sub menu.

To remove an entry from the favorites list, select **Remove from Favorites**.

Directories in the favorite list are marked by a star symbol in the top bar.

Click on the **Shares Places** sub menu and select **Share This** to make the current directory quickly available to other people in read-only mode.

When sharing a directory, you will be asked for a login name and a password. People can the access the share by logging into the shell via these credentials.
```
https://<address>:<port>/::shell/
```

Select **Unshare This** to close the share.

Directories that are shared are marked by a folder symbol in the top bar.


### Actions

There is a menu button at the right of the top bar. Click on it to open the actions menu.

Some actions require you to select one or more files before. Click on the right edge checkmark of a file to select. Click again to unselect it. You can also choose **Select All** or **Unselect All** from the actions menu to select or unselect all items at once.

#### View Sub Menu

This sub menu provides options for changing the view mode (list view ord grid view) and the sort order (by name or by date) of the items.

#### New Sub Menu

This sub menu lets you create new directories or empty files in the current directory.

#### Clipboard Sub Menu

The clipboard is used for cutting, copying, and pasting files and directories.

To move a file from one directory to another, first select the file and choose the **Cut** option. Then navigate to the directory where you want to move the file to and choose the **Paste** option.

Choosing **Copy** instead of **Cut** creates a copy of the file instead of moving it.

Select the **Show** option to show the current content of the clipboard. The contents of the clipboard are remembered between sessions. You can even cut files on one device and continue pasting them on another device.

The clipboard's contents are replaced whenever you cut or copy files, and cleared when you paste.

#### Action Sub Menu

This sub menu provides file actions.

* **Upload** Upload a local file.
* **Download** Download the selected files or directories. Directories are downloaded as ZIP archives.
* **Rename** Rename the currently selected file or directory.
* **Delete** Delete the currently selected files or directories.

## Viewers

The shell supports a few file types to be viewed directly in the shell. Some file types can even be edited.

### Images

Clicking on an image file will open the image in a popup. Tap on the popup to dismiss it.

Use the left and right arrow keys on your keyboard or swipe the image to the left or right on a touch screen in order to browse through all images in the current directory.

### Text and Markdown-formatted Text

Text files (\*.txt) and Markdown files (\*.md) have an edit button in the viewer in the right of the top bar. Click on this button to switch between view mode and edit mode. Changes made in edit mode are saved automatically when switching back to the view mode or when leaving the viewer.

### PDF Documents

PDF documents are opened in a PDF viewer.

### VCard Documents

VCard documents containing contacts cards are opened in a VCard viewer. Editing is not supported yet.

### Music Files

When opening a music file, a music player will appear at the bottom of the shell page. Switching to other directories does not stop the music.

While the music player is active, click on other music files to put them in the playing queue.

The music player can be closed anytime by pressing the close button on the right.
