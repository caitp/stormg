##Stormg

A little Node app for generating Twitch.tv HTML overlays for use with the
[OBS Studio](https://github.com/jp9000/obs-studio), using the
[Browser Plugin](https://obsproject.com/forum/resources/browser-plugin.115/).

Originally built for generating a simple overlay with player statistics for
Street Fighter 3: Third Strike (with the configuration to support this game
provided in the repository), it is simple to support any UI overlay you'd like,
for any game you'd like, by editing the client-side page and server to support
whatever is needed.

There are a lot of features which would be nice to have, but are currently
missing:

- statistical operations on "bump" type statistics
- persistent storage and retrieval of game statistics
- Support for retrieving information from remote services (such as Bungie, PSN
  or Battle.net)
- command aliases, shortcuts, or key bindings
- accepting commands from Twitch.tv bots or chatters
- accepting commands from a Web UI
- use Push rather than polling in the web app

If you find this project useful, or think it could be useful to you, any
contributions are appreciated.

-------------------------------------------------------------------------------

##Usage

The stormg server accepts commands sent via the command line (other input
methods are suggested but not yet implemented above). There are several
builtin commands:

- mode - loads a new [Mode](#modes) --- currently not very useful.
- undo - basic and very limited undo support.
- quit - quit the server.
- say - unimplemented --- in the future, may emit a command to the client
- refresh - mark all polling clients as updated, so that they will receive data
  on the next poll.
- stats - Print all 'bump' statistics to stdout.
- reset - Reset all game state to an initial state
- clients - Print a list of all connected polling clients to stdout.

These commands are used on the command line by typing `/%command name%` and
pressing enter. For example, to quit the application, you would enter `/quit`.

It is possible to define additional commands via the [Mode](#modes) API.

##Modes

A Mode is a JSON format which defines the commands understood by the
web server. In general, a mode maps to a game, or genre of games. The commands
defined in "sf3.json" are perfectly applicable to Guilty Gear XRD or BlazBlue,
but those games may wish to add additional statistics, such as commands to
indicate Instant Kills in Guilty Gear, or "perfect" rounds.

Currently, the Mode format is fairly simple, but this is an ad hoc format and
new things may be added as needed.

- Mode:
  - "name" --- the name of the "mode". This is the base name of the JSON file,
    by default --- but can be set to any string.
  - "commands" -- an Array of "command" structures, which define the commands
    supported by the mode.

- Command:
  - "type" --- the "type" or behaviour of the command (or set of commands).
  - "commands" --- an array of CommandDetails, all sharing the same "type".
  - "name" --- a String, or array of Strings, mapping to command names. This
    provides a quick way to define multiple named commands for the same type.

- CommandDetails:
  - "name" --- Behaves identical to Command "name", but must be a String.
  - "details" --- A more detailed description of the command name, for output
    via the "stats" command.

-------------------------------------------------------------------------------

This package includes binary representations of Apple's U+1F602 FACE WITH TEARS
OF JOY and U+1F621 POUTING FACE emojis, which simply look a lot better in
Apple fonts than they do anywhere else.

These are not my own designs, and are being used
reasonably. If anyone can provide better artwork with a CC0 or similar license,
Please send a pull request!

-------------------------------------------------------------------------------

This project is MIT licensed, see [LICENSE](LICENSE) for details.
