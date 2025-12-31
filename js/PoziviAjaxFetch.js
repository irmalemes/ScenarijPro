const PoziviAjaxFetch = (function () {

    function handleResponse(response, callback) {
        response
            .json()
            .then(data => callback(response.status, data))
            .catch(() => callback(response.status, null));
    }

    function handleError(err, callback) {
        callback(0, { message: "Greška pri komunikaciji sa serverom." });
    }

    return {

        /* ===== POST /api/scenarios ===== */
        postScenario: function (title, callback) {
            fetch("/api/scenarios", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title })
            })
            .then(res => handleResponse(res, callback))
            .catch(err => handleError(err, callback));
        },

        /* ===== POST /api/scenarios/:id/lines/:lineId/lock ===== */
        lockLine: function (scenarioId, lineId, userId, callback) {
            fetch(`/api/scenarios/${scenarioId}/lines/${lineId}/lock`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId })
            })
            .then(res => handleResponse(res, callback))
            .catch(err => handleError(err, callback));
        },

        /* ===== PUT /api/scenarios/:id/lines/:lineId ===== */
        updateLine: function (scenarioId, lineId, userId, newText, callback) {
            fetch(`/api/scenarios/${scenarioId}/lines/${lineId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, newText })
            })
            .then(res => handleResponse(res, callback))
            .catch(err => handleError(err, callback));
        },

        /* ===== POST /api/scenarios/:id/characters/lock ===== */
        lockCharacter: function (scenarioId, characterName, userId, callback) {
            fetch(`/api/scenarios/${scenarioId}/characters/lock`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, characterName })
            })
            .then(res => handleResponse(res, callback))
            .catch(err => handleError(err, callback));
        },

        /* ===== POST /api/scenarios/:id/characters/update ===== */
        updateCharacter: function (scenarioId, userId, oldName, newName, callback) {
            fetch(`/api/scenarios/${scenarioId}/characters/update`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, oldName, newName })
            })
            .then(res => handleResponse(res, callback))
            .catch(err => handleError(err, callback));
        },

        /* ===== GET /api/scenarios/:id/deltas ===== */
        getDeltas: function (scenarioId, since, callback) {
            fetch(`/api/scenarios/${scenarioId}/deltas?since=${since}`)
            .then(res => handleResponse(res, callback))
            .catch(err => handleError(err, callback));
        },

        /* ===== GET /api/scenarios/:id ===== */
        getScenario: function (scenarioId, callback) {
            fetch(`/api/scenarios/${scenarioId}`)
            .then(res => handleResponse(res, callback))
            .catch(err => handleError(err, callback));
        }
    };

})();
