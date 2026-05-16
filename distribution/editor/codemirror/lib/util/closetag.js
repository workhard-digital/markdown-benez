(function() {
  CodeMirror.defaults["closeTagEnabled"] = true;
  CodeMirror.defaults["closeTagIndent"] = [ "applet", "blockquote", "body", "button", "div", "dl", "fieldset", "form", "frameset", "h1", "h2", "h3", "h4", "h5", "h6", "head", "html", "iframe", "layer", "legend", "object", "ol", "p", "select", "table", "ul" ];
  CodeMirror.defaults["closeTagVoid"] = [ "area", "base", "br", "col", "command", "embed", "hr", "img", "input", "keygen", "link", "meta", "param", "source", "track", "wbr" ];
  function innerState(cm, state) {
    return CodeMirror.innerMode(cm.getMode(), state).state;
  }
  CodeMirror.defineExtension("closeTag", function(cm, ch, indent, vd) {
    if (!cm.getOption("closeTagEnabled")) {
      throw CodeMirror.Pass;
    }
    var pos = cm.getCursor();
    var tok = cm.getTokenAt(pos);
    var state = innerState(cm, tok.state);
    if (state) {
      if (ch == ">") {
        var type = state.type;
        if (tok.className == "tag" && type == "closeTag") {
          throw CodeMirror.Pass;
        }
        cm.replaceSelection(">");
        pos = {
          line: pos.line,
          ch: pos.ch + 1
        };
        cm.setCursor(pos);
        tok = cm.getTokenAt(cm.getCursor());
        state = innerState(cm, tok.state);
        if (!state) throw CodeMirror.Pass;
        var type = state.type;
        if (tok.className == "tag" && type != "selfcloseTag") {
          var tagName = state.tagName;
          if (tagName.length > 0 && shouldClose(cm, vd, tagName)) {
            insertEndTag(cm, indent, pos, tagName);
          }
          return;
        }
        cm.setSelection({
          line: pos.line,
          ch: pos.ch - 1
        }, pos);
        cm.replaceSelection("");
      } else if (ch == "/") {
        if (tok.className == "tag" && tok.string == "<") {
          var ctx = state.context, tagName = ctx ? ctx.tagName : "";
          if (tagName.length > 0) {
            completeEndTag(cm, pos, tagName);
            return;
          }
        }
      }
    }
    throw CodeMirror.Pass;
  });
  function insertEndTag(cm, indent, pos, tagName) {
    if (shouldIndent(cm, indent, tagName)) {
      cm.replaceSelection("\n\n</" + tagName + ">", "end");
      cm.indentLine(pos.line + 1);
      cm.indentLine(pos.line + 2);
      cm.setCursor({
        line: pos.line + 1,
        ch: cm.getLine(pos.line + 1).length
      });
    } else {
      cm.replaceSelection("</" + tagName + ">");
      cm.setCursor(pos);
    }
  }
  function shouldIndent(cm, indent, tagName) {
    if (typeof indent == "undefined" || indent == null || indent == true) {
      indent = cm.getOption("closeTagIndent");
    }
    if (!indent) {
      indent = [];
    }
    return indexOf(indent, tagName.toLowerCase()) != -1;
  }
  function shouldClose(cm, vd, tagName) {
    if (cm.getOption("mode") == "xml") {
      return true;
    }
    if (typeof vd == "undefined" || vd == null) {
      vd = cm.getOption("closeTagVoid");
    }
    if (!vd) {
      vd = [];
    }
    return indexOf(vd, tagName.toLowerCase()) == -1;
  }
  function indexOf(collection, elt) {
    if (collection.indexOf) return collection.indexOf(elt);
    for (var i = 0, e = collection.length; i < e; ++i) if (collection[i] == elt) return i;
    return -1;
  }
  function completeEndTag(cm, pos, tagName) {
    cm.replaceSelection("/" + tagName + ">");
    cm.setCursor({
      line: pos.line,
      ch: pos.ch + tagName.length + 2
    });
  }
})();