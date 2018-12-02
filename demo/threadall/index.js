document.addEventListener('DOMContentLoaded', async function() {
    const serverUrl = 'http://127.0.0.1:5000/',
        classColorScale = d3.scaleOrdinal(d3.schemeSet2);

    // Labelling
    const labellingContainer = d3.select('.threadlet-labelling'),
        labellingVis = pv.vis.labelling()
            .colorScale(classColorScale)
            .on('update', onUpdateLabels);

    // Thread Features
    const featureContainer = d3.select('.threadlet-features'),
        featureVis = pv.vis.threadall();
    let featureData = [];

    // Feature Projection
    const projectionContainer = d3.select('.threadlet-projection'),
    projectionVis = pv.vis.featureProjection()
        .colorScale(classColorScale);
    let projectionData = [];

    // Thread Overview
    const overviewContainer = d3.select('.threadlet-some'),
        overviewVis = pv.vis.threadsome()
            .on('click', function(d) {
                detailData = d.messages;
                redrawView(detailContainer, detailVis, detailData, true);
            });
    let overviewData = [];

    // Thread Messages
    const detailContainer = d3.select('.threadlet-detail'),
        detailVis = pv.vis.thread()
            .on('hover', function(d) {
                if (!detailVis.selectedMessage()) {
                    messageData = [d];
                    redrawView(messageContainer, messageVis, messageData);
                }
            }).on('click', function(d) {
                messageData = [d];
                redrawView(messageContainer, messageVis, messageData);
            });
    let detailData = [];

    // Message
    const messageContainer = d3.select('.threadlet-message'),
        messageVis = pv.vis.message();
    let messageData = [];

    // Make the vis responsive to window resize
    window.onresize = _.throttle(update, 100);

    const threadLinkedViews = [ featureVis, projectionVis ];
    const timeFormat = d3.timeFormat('%d-%b-%Y');

    registerThreadLinkedViews();

    d3.json('../../data/threads-100_revV2.json').then(data => {
        featureData = {
            features: [
                { name: 'Engagement', label: 'Engagement' },
                { name: 'PaceOfInteractionAvgGap', label: 'Interaction Pace' },
                { name: 'ParticipantGrowth', label: 'Participant Growth' },
                { name: 'ParticipantSizeVariation', label: 'Participant Size Variation' },
                { name: 'SenderDiversity', label: 'Sender Diversity' },
                { name: 'SenderDiversityEntropy', label: 'Sender Diversity Entropy' }
            ],
            threads: data
        };

        // Convert timestamp from String to Date
        data.forEach(t => {
            t.messages.forEach(m => {
                m.time = new Date(m.time);
            });

            // Starting time of the thread
            t.startTime = t.messages[0].time;
            t.endTime = _.last(t.messages).time;

            // Tooltip
            t.tooltip = timeFormat(t.startTime) + ' ⟶ ' + timeFormat(t.endTime);
            featureData.features.forEach(feature => {
                t.tooltip += '\n' + feature.label + ': ' + parseFloat(t[feature.name].toFixed(1)).toString();
            });
        });

        projectionData = getProjectionData(featureData.threads);
        overviewData = featureData.threads.slice(0, 3);
        detailData = featureData.threads[0].messages;
        messageData = detailData.slice(0, 1);
        labellingVis.allIds(featureData.threads.map(d => d.threadId));

        // Build the vises
        update();

        // testRestAPI('http://127.0.0.1:5000/?params=');
    });

    /**
     * Updates vises when window changed.
     */
    function update() {
        redrawView(featureContainer, featureVis, featureData);
        redrawView(projectionContainer, projectionVis, projectionData);
        redrawView(overviewContainer, overviewVis, overviewData);
        redrawView(detailContainer, detailVis, detailData);
        redrawView(messageContainer, messageVis, messageData);
        labellingContainer.call(labellingVis);
    }

    function redrawView(container, vis, data, invalidated) {
        const rect = pv.getContentRect(container.node());
        vis.width(rect[0]).height(rect[1]);
        if (invalidated) vis.invalidate();
        container.datum(data).call(vis);
    }

    function testRestAPI(url) {
        const s = featureData.threads.slice(0, 10).map(d => d.threadId).join(',');
        $.ajax(url + s)
            .done(r => {
                console.log(r);
            });
    }

    function getProjectionData(data) {
        return data.map(d => ({ threadId: d.threadId, dim1: d.tSNEX, dim2: d.tSNEY, tooltip: d.tooltip }));
    }

    function registerThreadLinkedViews() {
        threadLinkedViews.forEach(v => {
            v.on('brush', onThreadsBrush)
            .on('brushend', onThreadsBrushend)
            .on('hover', onThreadHover)
            .on('click', onThreadClick);
    });

    }
    function onThreadsBrush(ids) {
        threadLinkedViews.forEach(v => {
            if (v !== this) v.onBrush(ids);
        });
    }

    function onThreadsBrushend(ids) {
        overviewData = featureData.threads.filter(t => ids.includes(t.threadId));
        redrawView(overviewContainer, overviewVis, overviewData, true);
    }

    function onThreadHover(id) {
        threadLinkedViews.forEach(v => {
            if (v !== this) v.onHover(id);
        });
    }

    function onThreadClick(id) {
        detailData = featureData.threads.find(t => t.threadId === id).messages;
        redrawView(detailContainer, detailVis, detailData, true);

        // Also clear the message view
        messageData = [];
        redrawView(messageContainer, messageVis, messageData);

        // And clear the selecion of thread messages
        detailVis.selectedMessage(null);
    }

    function onUpdateLabels(d) {
        // Ask the modelling to build or update model
        const url = `${serverUrl}model?data=${JSON.stringify(d.threads)}&rec=${d.recommend}`;
        $.ajax(url).done(r => {
            r = JSON.parse(r);

            console.log('Here is the response from the server');
            console.log(r);

            // Update thread projection view
            projectionVis.classLookup(r.classLookup)
                .highlightedThreadIds(r.samples);
            redrawView(projectionContainer, projectionVis, projectionData);
        });
    }
});