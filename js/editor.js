const USER_ID = Math.floor(Math.random() * 10000) + 1;
let SCENARIO_ID = null;

let lastTimestamp = 0;
let trenutnoZakljucanaLinijaId = null;
let editor = null;

window.addEventListener("DOMContentLoaded", () => {

    const divEditor = document.getElementById("divEditor");
    const porukeDiv = document.getElementById("poruke");
    const btnSpasi = document.querySelector(".save-btn");

    function ispisiPoruku(msg, boja = "black") {
        porukeDiv.innerHTML = `<p style="color:${boja}">${msg}</p>`;
        porukeDiv.style.display = "block";
    }


    const hasLoadedBefore = sessionStorage.getItem("hasLoadedBefore");

    if (!hasLoadedBefore) {
        sessionStorage.setItem("hasLoadedBefore", "true");
        SCENARIO_ID = 1;
        ucitajScenario();
    } else {
        kreirajScenario();
    }

    /* ================== KREIRANJE SCENARIJA ================== */
    function kreirajScenario() {
        PoziviAjaxFetch.postScenario("THE LAST STARSHIP", (status, data) => {
            if (status === 200) {
                SCENARIO_ID = data.id;
                ispisiPoruku(`Novi scenarij kreiran. ID = ${SCENARIO_ID}`, "green");
                prikaziScenario(data);
            } else {
                ispisiPoruku("Greška pri kreiranju scenarija.", "red");
            }
        });
    }

    /* ================== UČITAVANJE SCENARIJA ================== */
    function ucitajScenario() {
        PoziviAjaxFetch.getScenario(SCENARIO_ID, (status, scenario) => {
            if (status === 200) {
                prikaziScenario(scenario);
            } else {
                ispisiPoruku("Scenario ne postoji.", "red");
            }
        });
    }

    /* ================== PRIKAZ SCENARIJA ================== */
    function prikaziScenario(scenario) {

        const map = {};
        scenario.content.forEach(l => map[l.lineId] = l);

        let start = scenario.content.find(l =>
            !scenario.content.some(x => x.nextLineId === l.lineId)
        );

        let html = "";
        let curr = start;

        while (curr) {
            html += `<p data-line-id="${curr.lineId}">${curr.text}</p>`;
            curr = curr.nextLineId ? map[curr.nextLineId] : null;
        }

        divEditor.innerHTML = html;
        editor = EditorTeksta(divEditor);
    }

    /* ================== KLIK NA LINIJU (LOCK) ================== */
    divEditor.addEventListener("click", (e) => {
        const p = e.target.closest("p");
        if (!p) return;

        const lineId = Number(p.dataset.lineId);

        PoziviAjaxFetch.lockLine(SCENARIO_ID, lineId, USER_ID, (status, data) => {
            if (status === 200) {
                divEditor.querySelectorAll("p").forEach(el => el.contentEditable = false);
                p.contentEditable = true;
                p.focus();
                trenutnoZakljucanaLinijaId = lineId;
                ispisiPoruku(`Linija ${lineId} zaključana.`, "blue");
            } else {
                ispisiPoruku(data.message, "red");
            }
        });
    });

    /* ================== SAVE ================== */
    btnSpasi.addEventListener("click", () => {

        if (!trenutnoZakljucanaLinijaId) {
            ispisiPoruku("Nijedna linija nije zaključana.", "orange");
            return;
        }

        const p = divEditor.querySelector(
            `p[data-line-id="${trenutnoZakljucanaLinijaId}"]`
        );
        if (!p) return;

        const tekst = [p.innerText];

        PoziviAjaxFetch.updateLine(
            SCENARIO_ID,
            trenutnoZakljucanaLinijaId,
            USER_ID,
            tekst,
            (status, data) => {
                if (status === 200) {
                    ispisiPoruku("Linija uspješno sačuvana!", "green");
                    trenutnoZakljucanaLinijaId = null;
                    setTimeout(ucitajScenario, 500);
                } else {
                    ispisiPoruku(data.message, "red");
                }
            }
        );
    });

    /* ================== POLLING ================== */
    setInterval(() => {
        if (!SCENARIO_ID) return;

        PoziviAjaxFetch.getDeltas(SCENARIO_ID, lastTimestamp, (status, data) => {
            if (status !== 200 || !data.deltas) return;

            data.deltas.forEach(d => {
                lastTimestamp = Math.max(lastTimestamp, d.timestamp);

                if (d.type === "line_update") {
                    ucitajScenario();
                }

                if (d.type === "char_rename") {
                    zamijeniImeLika(d.oldName, d.newName);
                }
            });
        });
    }, 3000);

    function zamijeniImeLika(oldName, newName) {
        divEditor.querySelectorAll("p").forEach(p => {
            p.innerText = p.innerText.split(oldName).join(newName);
        });
    }

});
