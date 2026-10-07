/* Hosts like the Design canvas put each component and icon in its own display:contents element. Tag
   those wrappers [data-ds-contents]; bundle.css has copies of the child, sibling and position rules that
   look through them (see wrapper-css.mjs in the build). Pages without such wrappers get no tags. */
;(function () {
  if (
    typeof document === "undefined" ||
    typeof MutationObserver === "undefined"
  )
    return
  var TARGET = "[data-slot], svg"

  function isWrapper(el) {
    if (el.hasAttribute("data-slot") || el instanceof SVGElement) return false
    return (
      el.style.display === "contents" ||
      getComputedStyle(el).display === "contents"
    )
  }
  function tag(root) {
    var els = root.querySelectorAll ? root.querySelectorAll(TARGET) : []
    for (var i = -1; i < els.length; i++) {
      var el = i < 0 ? root : els[i],
        p = el.parentElement
      if (!p || !el.matches || !el.matches(TARGET)) continue
      if (!p.hasAttribute("data-ds-contents") && isWrapper(p))
        p.setAttribute("data-ds-contents", "")
    }
  }
  // Mutation callbacks run before the next paint, so new wrappers are tagged before they show
  new MutationObserver(function (records) {
    for (var r = 0; r < records.length; r++)
      for (var k = 0; k < records[r].addedNodes.length; k++)
        if (records[r].addedNodes[k].nodeType === 1)
          tag(records[r].addedNodes[k])
  }).observe(document.documentElement, { childList: true, subtree: true })
  tag(document.documentElement)

  // InputGroupAddon focuses the input through parentElement, which is the wrapper here
  document.addEventListener("click", function (e) {
    var t = e.target
    if (!(t instanceof Element) || t.closest("button")) return
    var addon = t.closest("[data-slot=input-group-addon]")
    if (
      !addon ||
      !addon.parentElement ||
      !addon.parentElement.hasAttribute("data-ds-contents")
    )
      return
    var group = addon.closest("[data-slot=input-group]")
    var input = group && group.querySelector("input")
    if (input) input.focus()
  })
})()
