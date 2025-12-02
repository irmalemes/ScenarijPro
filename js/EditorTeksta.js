let EditorTeksta = function (divRef) {

    if (!divRef || !(divRef instanceof HTMLElement))
        throw "Pogresan tip elementa!";
    if (divRef.tagName !== "DIV")
        throw "Pogresan tip elementa!";
    if (divRef.getAttribute("contenteditable") !== "true")
        throw "Neispravan DIV, ne posjeduje contenteditable atribut!";

    let ref = divRef;

    //koristeni regexi

    const EMPTY_LINE = /^\s*$/;
    const SCENE_LINE = /^(INT\.|EXT\.)[\s\S]*-\s*(DAY|NIGHT|AFTERNOON|MORNING|EVENING)\s*$/;
    const ROLE_LINE = /^(?=.*[A-ZČĆŽŠĐ])[A-ZČĆŽŠĐ\s]+[.,]?\s*$/;
    const BRACKET_LINE = /^\s*\(.+\)\s*$/;

    const WORD_TOKEN = /[A-Za-zČĆŽŠĐčćžšđ]+(?:[-'][A-Za-zČĆŽŠĐčćžšđ]+)*/g;
    const VALID_WORD = /^[A-Za-zČĆŽŠĐčćžšđ]+$/;
    const NUMBER_TOKEN = /^[0-9]+(\.[0-9]+)?$/;

    //pomocne f-je

    function getLines() {
        let t = ref.innerText.replace(/\r\n/g, "\n");
        return t.split("\n");
    }

    function isScene(line) {
        return SCENE_LINE.test(line.trim());
    }

    function isEmpty(line) {
        return EMPTY_LINE.test(line);
    }

    function isUloga(line) {
        return ROLE_LINE.test(line.trim());
    }

    function isBracket(line) {
        return BRACKET_LINE.test(line.trim());
    }

    function isAction(line) {
        let t = line.trim();
        return (
            t.length > 0 &&
            !isScene(t) &&
            !isUloga(t) &&
            !isBracket(t)
        );
    }

   //funkcije

    function parseScenes() {
        let lines = getLines();
        let scenes = [];
        let current = { scena: "SCENARIO START", lines: [] };
        let first = false;

        for (let line of lines) {
            if (isScene(line)) {
                if (!first) {
                    current.scena = line.trim();
                    first = true;
                } else {
                    scenes.push(current);
                    current = { scena: line.trim(), lines: [] };
                }
            } else {
                current.lines.push(line);
            }
        }
        scenes.push(current);
        return scenes;
    }



    function parseUlogeIScenu() {

    let scenes = parseScenes();
    let out = [];

    for (let sc of scenes) {

        let lines = sc.lines;
        let replike = [];
        let ulogeScene = [];
        let i = 0;

        while (i < lines.length) {

            let line = lines[i].trim();
            if (isEmpty(line)) { i++; continue; }

         
            if (isUloga(line)) {

                let j = i + 1;

                while (j < lines.length && (isEmpty(lines[j].trim()) || isBracket(lines[j].trim()))) {
                    j++;
                }

                if (j >= lines.length || isScene(lines[j].trim()) || isUloga(lines[j].trim())) {
                    replike.push({ tip: "akcija", scena: sc.scena });
                    i++;
                    continue;
                }
            }

        
            if (!isUloga(line) && isAction(line)) {
                replike.push({ tip: "akcija", scena: sc.scena });
                i++;
                continue;
            }

            if (isUloga(line)) {

                let ime = line.replace(/[.,]$/, "").trim();
                let j = i + 1;
                let nextValid = false;

                while (j < lines.length) {
                    let ln = lines[j].trim();

                    if (isEmpty(ln) || isBracket(ln)) { j++; continue; }

                    if (isUloga(ln) || isScene(ln)) {  
                        nextValid = false;
                        break;
                    }

                    nextValid = true;
                    break;
                }

                if (!nextValid) { i++; continue; }

                let blok = [];
                j = i + 1;

                while (j < lines.length) {
                    let ln = lines[j].trim();

                    if (isUloga(ln) || isScene(ln))
                        break;

                    if (!isBracket(ln) && !isEmpty(ln))
                        blok.push(ln);

                    j++;
                }

                if (blok.length > 0) {
                    if (!ulogeScene.includes(ime))
                        ulogeScene.push(ime);

                    replike.push({
                        uloga: ime,
                        linije: blok,
                        scena: sc.scena
                    });
                }

                i = j;
                continue;
            }
            i++;
        }

        out.push({
            scena: sc.scena,
            uloge: ulogeScene,
            replike: replike
        });
    }

    return out;
}

    let dajUloge = function () {
        let p = parseUlogeIScenu();
        let set = [];
        for (let s of p)
            for (let u of s.uloge)
                if (!set.includes(u)) set.push(u);
        return set;
    };

    let brojLinijaTeksta = function (uloga) {
        let p = parseUlogeIScenu();
        let c = 0;
        for (let s of p)
            for (let r of s.replike)
                if (r.uloga === uloga)
                    c += r.linije.length;
        return c;
    };

    let scenarijUloge = function (uloga) {
        let parsed = parseUlogeIScenu();
        let rez = [];

        for (let sc of parsed) {
            let localPos = 1;
            let reps = sc.replike;

            for (let i = 0; i < reps.length; i++) {

                let rep = reps[i];

                if (rep.tip === "akcija")
                    continue;

                if (rep.uloga !== uloga) {
                    localPos++;
                    continue;
                }

                let prev = (i > 0 && reps[i - 1].tip !== "akcija")
                    ? { uloga: reps[i - 1].uloga, linije: reps[i - 1].linije }
                    : null;

                let next = (i < reps.length - 1 && reps[i + 1].tip !== "akcija")
                    ? { uloga: reps[i + 1].uloga, linije: reps[i + 1].linije }
                    : null;

                rez.push({
                    scena: sc.scena,
                    pozicijaUTekstu: localPos,
                    prethodni: prev,
                    trenutni: { uloga: rep.uloga, linije: rep.linije },
                    sljedeci: next
                });

                localPos++;
            }
        }

        return rez;
    };

    let grupisiUloge = function () {

        let parsed = parseUlogeIScenu();
        let rez = [];

        for (let sc of parsed) {

            let segm = [];
            let curr = [];

            for (let rep of sc.replike) {

                if (rep.tip === "akcija") {
                    if (curr.length) {
                        segm.push([...curr]);
                        curr = [];
                    }
                    continue;
                }

                if (!curr.includes(rep.uloga))
                    curr.push(rep.uloga);
            }

            if (curr.length) segm.push(curr);

            for (let g of segm)
                rez.push({ scena: sc.scena, uloge: g });
        }

        return rez;
    };

    let pogresnaUloga = function () {

        let parsed = parseUlogeIScenu();
        let cnt = {};

        for (let sc of parsed)
            for (let r of sc.replike)
                cnt[r.uloga] = (cnt[r.uloga] || 0) + 1;

        let names = Object.keys(cnt);
        let wrong = [];

        function diff(a, b) {
            let L = Math.min(a.length, b.length);
            let d = Math.abs(a.length - b.length);
            for (let i = 0; i < L; i++)
                if (a[i] !== b[i]) d++;
            return d;
        }

        for (let A of names)
            for (let B of names) {
                if (A === B) continue;

                let d = diff(A, B);

                if (A.length <= 5 && B.length <= 5) {
                    if (d === 1) {
                        if (cnt[A] * 4 <= cnt[B])
                            if (!wrong.includes(A)) wrong.push(A);
                        if (cnt[B] * 4 <= cnt[A])
                            if (!wrong.includes(B)) wrong.push(B);
                    }
                } else {
                    if (d <= 2) {
                        if (cnt[A] * 4 <= cnt[B])
                            if (!wrong.includes(A)) wrong.push(A);
                        if (cnt[B] * 4 <= cnt[A])
                            if (!wrong.includes(B)) wrong.push(B);
                    }
                }
            }

        return wrong;
    };
let dajBrojRijeci = function () {

    let total = 0;
    let boldCount = 0;
    let italicCount = 0;

    const walker = document.createTreeWalker(ref, NodeFilter.SHOW_TEXT);

    while (walker.nextNode()) {
        const node = walker.currentNode;
        let text = node.nodeValue;

        
        const words = text.match(/[A-Za-zČĆŽŠĐčćžšđ]+(?:[-'][A-Za-zČĆŽŠĐčćžšđ]+)*/g);
        if (!words) continue;

        for (let w of words) {

        
            if (/^[0-9]+(\.[0-9]+)?$/.test(w)) continue;

          
            total++;

        
            let bold = false;
            let italic = false;

            let p = node.parentNode;
            while (p) {
                const tag = p.tagName;
                if (tag === "B" || tag === "STRONG") bold = true;
                if (tag === "I" || tag === "EM") italic = true;
                p = p.parentNode;
            }

            if (bold) boldCount++;
            if (italic) italicCount++;
        }
    }

    return {
        ukupno: total,
        boldiranih: boldCount,
        italic: italicCount
    };
};



    let formatirajTekst = function (k) {
        if (!["bold", "italic", "underline"].includes(k)) return false;

        let sel = window.getSelection();
        if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;

        ref.focus();
        try {
            document.execCommand(k, false, null);
            return true;
        } catch {
            return false;
        }
    };

    return {
        dajBrojRijeci,
        dajUloge,
        pogresnaUloga,
        brojLinijaTeksta,
        scenarijUloge,
        grupisiUloge,
        formatirajTekst
    };
};
