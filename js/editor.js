window.addEventListener("DOMContentLoaded", function () {

    let div = document.getElementById("divEditor");
    let editor = EditorTeksta(div);


    let porukeDiv = document.getElementById("poruke");

    function ispisiPoruku(msg) {
        porukeDiv.innerText = msg;
        porukeDiv.style.display = "block";
    }

    function ispisiObjekt(obj) {
        porukeDiv.innerText = JSON.stringify(obj, null, 4);
        porukeDiv.style.display = "block";
    }

    // Buttons
    let btnBrojRijeci = document.getElementById("btnBrojRijeci");
    let btnUloge = document.getElementById("btnUloge");
    let btnPogresne = document.getElementById("btnPogresne");

    let btnBrojLinija = document.getElementById("btnBrojLinija");
    let btnScenarijUloge = document.getElementById("btnScenarijUloge");
    let btnGrupisi = document.getElementById("btnGrupisi");

    let fmtBold = document.getElementById("fmtBold");
    let fmtItalic = document.getElementById("fmtItalic");
    let fmtUnder = document.getElementById("fmtUnder");

    let ulogaInput = document.getElementById("ulogaInput");



    btnBrojRijeci.addEventListener("click", function () {
        let rez = editor.dajBrojRijeci();
        ispisiObjekt(rez);
    });


    
    btnUloge.addEventListener("click", function () {
        let rez = editor.dajUloge();
        ispisiObjekt(rez);
    });


    
    btnPogresne.addEventListener("click", function () {
        let rez = editor.pogresnaUloga();
        ispisiObjekt(rez);
    });


    
    btnBrojLinija.addEventListener("click", function () {
        let uloga = ulogaInput.value.trim().toUpperCase();

        if (!uloga) {
            ispisiPoruku("Molimo unesite ime uloge.");
            return;
        }

        let rez = editor.brojLinijaTeksta(uloga);
        ispisiPoruku(`Uloga "${uloga}" ima ukupno ${rez} linija teksta.`);
    });


 
    btnScenarijUloge.addEventListener("click", function () {
        let uloga = ulogaInput.value.trim().toUpperCase();

        if (!uloga) {
            ispisiPoruku("Molimo unesite ime uloge.");
            return;
        }

        let rez = editor.scenarijUloge(uloga);
        ispisiObjekt(rez);
    });


    btnGrupisi.addEventListener("click", function () {
        let rez = editor.grupisiUloge();
        ispisiObjekt(rez);
    });



    fmtBold.addEventListener("click", function () {
        let ok = editor.formatirajTekst("bold");
        if (!ok) ispisiPoruku("Nijedan tekst nije selektovan.");
    });

    fmtItalic.addEventListener("click", function () {
        let ok = editor.formatirajTekst("italic");
        if (!ok) ispisiPoruku("Nijedan tekst nije selektovan.");
    });

    fmtUnder.addEventListener("click", function () {
        let ok = editor.formatirajTekst("underline");
        if (!ok) ispisiPoruku("Nijedan tekst nije selektovan.");
    });

});
