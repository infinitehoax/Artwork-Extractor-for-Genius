document.addEventListener('DOMContentLoaded', function () {
    function showContent(id) {
        var contents = document.querySelectorAll('.content > div');
        contents.forEach(content => content.style.display = 'none');
        var element = document.getElementById(id);
        if (element) {
            element.style.display = 'block';

            const columnsContainer = element.querySelector('.columns-container');
            if (columnsContainer) columnsContainer.style.display = 'flex';

            ['.one-column', '.left-column', '.divider', '.right-column'].forEach(selector => {
                const column = element.querySelector(selector);
                if (column) column.style.display = 'block';
            });

            document.querySelectorAll('.frame').forEach(frame => frame.style.display = 'block');
            document.querySelectorAll('.function-container').forEach(container => container.style.display = 'block');
        }
    }

    document.querySelectorAll('a[data-id]').forEach(link => {
        const id = link.getAttribute('data-id');
        link.href = `${id}`;
    });


    var menuLinks = document.querySelectorAll('.menu a');
    menuLinks.forEach(link => {
        link.addEventListener('click', function (event) {
            event.preventDefault();
            showContent(this.getAttribute('data-id'));
        });
    });

    const hash = window.location.hash;
    if (hash) {
        showContent(hash.substring(1));
    } else {
        showContent('homepage');
    }

    chrome.storage.local.get('darkMode', function (result) {
        if (result.darkMode) {
            document.body.classList.add('dark-mode');
            document.querySelector('.menu').classList.add('dark-mode');
        }
    });

    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        if (request.darkMode !== undefined) {
            if (request.darkMode) {
                document.body.classList.add('dark-mode');
                document.querySelector('.menu').classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
                document.querySelector('.menu').classList.remove('dark-mode');
            }
        }
    });

    document.getElementById('saveButton').addEventListener('click', () => {
        const newApiKey = document.getElementById('imgbbApiKey').value;
        chrome.storage.local.set({ imgbbApiKey: newApiKey }, () => {
            console.log('API key successfully saved!');
            console.log('ImgBB API Key:', newApiKey);
            alert('API key successfully saved!');
        });
    });

    document.getElementById('saveButtonTidal').addEventListener('click', () => {
        const newCountryCode = document.getElementById('tidalCountryCode').value;
        chrome.storage.local.set({ tidalCountryCode: newCountryCode }, () => {
            console.log('Tidal country code successfully saved!');
            console.log('Tidal Country Code:', newCountryCode);
            alert('Tidal country code successfully saved!');
        });
    });

    function setupEventListener(prefix) {
        const convertCheckbox = document.getElementById(`${prefix}ConvertPNG`);
        const saveCheckbox = document.getElementById(`${prefix}SaveImage`);
        const hostImgBB = document.getElementById(`${prefix}HostImgBB`);
        const hostImageFilestack = document.getElementById(`${prefix}HostFilestack`);

        const hostImageSpanImgBB = document.querySelector(`#${prefix}HostImgBB`).parentElement.nextElementSibling;
        const hostImageSpanFilestack = document.querySelector(`#${prefix}HostFilestack`).parentElement.nextElementSibling;

        function enforceOneActive(active, others) {
            if (active.checked) {
                others.forEach(cb => cb.checked = false);
            } else {
                active.checked = true;
            }
        }

        convertCheckbox.addEventListener("change", function () {
            hostImageSpanImgBB.textContent = this.checked ? "Host Image (ImgBB)" : "Copy Image";
            hostImageSpanFilestack.textContent = this.checked ? "Host Image (Filestack)" : "Copy Image";
        });

        saveCheckbox.addEventListener("change", function () {
            enforceOneActive(saveCheckbox, [hostImgBB, hostImageFilestack]);
        });

        hostImgBB.addEventListener("change", function () {
            enforceOneActive(hostImgBB, [saveCheckbox, hostImageFilestack]);
        });

        hostImageFilestack.addEventListener("change", function () {
            enforceOneActive(hostImageFilestack, [saveCheckbox, hostImgBB]);
        });

        if (!saveCheckbox.checked && !hostImgBB.checked && !hostImageFilestack.checked) {
            saveCheckbox.checked = true;
        }
    }


    function saveOrder() {
        const order = {};
        const inputs = document.querySelectorAll('.function-container input');

        inputs.forEach(input => {
            let value = parseInt(input.value, 10);

            if (input.id === "additional_credits") {
                value = (value === 15) ? 15 : 0;
            } else {
                value = (value >= 0 && value <= 14) ? value : 0;
            }

            order[input.id] = value;
        });

        chrome.storage.local.set({ functionOrder: order }, () => {
            reorderHTML(order);
        });
    }

    chrome.storage.local.get(["functionOrder"], (result) => {
        const order = result.functionOrder || {};
        const frame = document.querySelector('.frame');

        const inputs = document.querySelectorAll('.function-container input');

        inputs.forEach((input, index) => {
            input.value = order[input.id] ?? (index + 1);
        });

        reorderHTML(order);
    });

    function reorderHTML(order) {
        const frames = Array.from(document.querySelectorAll('.frame'));

        frames.forEach(frame => {
            const functionContainers = Array.from(frame.querySelectorAll('.function-container'));
            const saveButton = frame.querySelector("#saveMetadataButton");

            functionContainers.sort((a, b) => {
                const aKey = a.querySelector("input").id;
                const bKey = b.querySelector("input").id;
                return (order[aKey] ?? 0) - (order[bKey] ?? 0);
            });

            functionContainers.forEach(container => container.remove());
            functionContainers.forEach(container => frame.appendChild(container));

            let warningText = document.getElementById("warningText");
            if (!warningText) {
                warningText = document.createElement("span");
                warningText.id = "warningText";
                warningText.style.color = "red";
                warningText.style.marginLeft = "10px";
                warningText.style.display = "none";
                warningText.textContent = "Invalid input";
            }

            if (saveButton) {
                frame.appendChild(saveButton);
                frame.appendChild(warningText);
            }
        });
    }

    const inputs = document.querySelectorAll('.function-container input');
    inputs.forEach(input => {
        input.addEventListener("change", function () {
            let value = parseInt(input.value, 10);
            let warningText = document.getElementById("warningText");

            if (input.id === "additional_credits") {
                warningText.style.display = (value !== 0 && value !== 15) ? "inline" : "none";
            } else {
                warningText.style.display = (value < 0 || value > 14) ? "inline" : "none";
            }
        });
    });


    setupEventListener("is45");
    setupEventListener("isDistroKid");
    setupEventListener("isSoundCloud");
    setupEventListener("isSpotify");
    setupEventListener("isTidal");
    setupEventListener("isYandexMusic");

    function saveSettings() {
        const isGeniusSongSongPage = document.getElementById('isGeniusSongSongPage').checked;
        const isGeniusSongSongPageZwsp = document.getElementById('isGeniusSongSongPageZwsp').checked;
        const isGeniusSongSongPageInfo = document.getElementById('isGeniusSongSongPageInfo').checked;
        const isGeniusSongSongId = document.getElementById('isGeniusSongSongId').checked;
        const isGeniusSongCheckIndex = document.getElementById('isGeniusSongCheckIndex').checked;
        const isGeniusSongFollowButton = document.getElementById('isGeniusSongFollowButton').checked;
        const isGeniusSongTranslationButton = document.getElementById('isGeniusSongTranslationButton').checked;
        const isGeniusSongShellyButton = document.getElementById('isGeniusSongShellyButton').checked;
        const isGeniusSongCleanupMetadataButton = document.getElementById('isGeniusSongCleanupMetadataButton').checked;
        const isGeniusSongAdvancedJson = document.getElementById('isGeniusSongAdvancedJson').checked;
        const isGeniusSongLanguageButton = document.getElementById('isGeniusSongLanguageButton').checked;
        const isGeniusSongCleanupButton = document.getElementById('isGeniusSongCleanupButton').checked;
        const isGeniusSongSectionsButtons = document.getElementById('isGeniusSongSectionsButtons').checked;
        const isGeniusSongExpandSectionsButtons = document.getElementById('isGeniusSongExpandSectionsButtons').checked;
        const isGeniusSongAnnotationsButtons = document.getElementById('isGeniusSongAnnotationsButtons').checked;
        const isGeniusSongFilterActivity = document.getElementById('isGeniusSongFilterActivity').checked;
        const isGeniusSongFilterNotifications = document.getElementById('isGeniusSongFilterNotifications').checked;
        const isGeniusSongSaveFilters = document.getElementById('isGeniusSongSaveFilters').checked;
        const isGeniusSongFilterFirehose = document.getElementById('isGeniusSongFilterFirehose').checked;
        const isGeniusSongCopyCover = document.getElementById('isGeniusSongCopyCover').checked;
        const isGeniusSongAppleMusicPlayer = document.getElementById('isGeniusSongAppleMusicPlayer').checked;
        const isGeniusSongYouTubePlayer = document.getElementById('isGeniusSongYouTubePlayer').checked;
        const isGeniusSongSoundCloudPlayer = document.getElementById('isGeniusSongSoundCloudPlayer').checked;
        const isGeniusSongSpotifyPlayer = document.getElementById('isGeniusSongSpotifyPlayer').checked;
        const isGeniusSongLyricEditor = document.getElementById('isGeniusSongLyricEditor').checked;
        const isGeniusSongRenameButtons = document.getElementById('isGeniusSongRenameButtons').checked;
        const isGeniusAlbumAlbumPage = document.getElementById('isGeniusAlbumAlbumPage').checked;
        const isGeniusAlbumAlbumPageZwsp = document.getElementById('isGeniusAlbumAlbumPageZwsp').checked;
        const isGeniusAlbumAlbumPageInfo = document.getElementById('isGeniusAlbumAlbumPageInfo').checked;
        const isGeniusAlbumAlbumId = document.getElementById('isGeniusAlbumAlbumId').checked;
        const isGeniusAlbumAlbumPageLyrics = document.getElementById('isGeniusAlbumAlbumPageLyrics').checked;
        const isGeniusAlbumExpandTracklist = document.getElementById('isGeniusAlbumExpandTracklist').checked;
        const isGeniusAlbumEditTracklist = document.getElementById('isGeniusAlbumEditTracklist').checked;
        const isGeniusAlbumUploadCover = document.getElementById('isGeniusAlbumUploadCover').checked;
        const isGeniusAlbumRenameButtons = document.getElementById('isGeniusAlbumRenameButtons').checked;
        const isGeniusAlbumSongCreditsButton = document.getElementById('isGeniusAlbumSongCreditsButton').checked;
        const isGeniusAlbumSongCreditsAutoReopen = document.getElementById('isGeniusAlbumSongCreditsAutoReopen').checked;
        const isGeniusAlbumFollowButton = document.getElementById('isGeniusAlbumFollowButton').checked;
        const isGeniusAlbumCleanupButton = document.getElementById('isGeniusAlbumCleanupButton').checked;
        const isGeniusArtistArtistPage = document.getElementById('isGeniusArtistArtistPage').checked;
        const isGeniusArtistArtistPageZwsp = document.getElementById('isGeniusArtistArtistPageZwsp').checked;
        const isGeniusArtistArtistPageInfo = document.getElementById('isGeniusArtistArtistPageInfo').checked;
        const isGeniusArtistArtistId = document.getElementById('isGeniusArtistArtistId').checked;
        const isGeniusArtistAllSongsAlbumsPage = document.getElementById('isGeniusArtistAllSongsAlbumsPage').checked;
        const isGeniusArtistAllSongsAlbumsPageMetadata = document.getElementById('isGeniusArtistAllSongsAlbumsPageMetadata').checked;
        const isGeniusArtistAllSongsAlbumsPageZwsp = document.getElementById('isGeniusArtistAllSongsAlbumsPageZwsp').checked;
        const isGeniusArtistFollowButton = document.getElementById('isGeniusArtistFollowButton').checked;
        const isGeniusArtistSpreadsheetButton = document.getElementById('isGeniusArtistSpreadsheetButton').checked;
        const isGeniusArtistSearchArtistMetadata = document.getElementById('isGeniusArtistSearchArtistMetadata').checked;
        const isGeniusArtistBulkAwardIq = document.getElementById('isGeniusArtistBulkAwardIq').checked;
        const isGeniusArtistRecords = document.getElementById('isGeniusArtistRecords').checked;
        const isGeniusArtistNewPage = document.getElementById('isGeniusArtistNewPage').checked;
        const is45CopyCover = document.getElementById('is45CopyCover').checked;
        const is45Popup = document.getElementById('is45Popup').checked;
        const is45ConvertPNG = document.getElementById('is45ConvertPNG').checked;
        const is45SaveImage = document.getElementById('is45SaveImage').checked;
        const is45HostImgBB = document.getElementById('is45HostImgBB').checked;
        const is45HostFilestack = document.getElementById('is45HostFilestack').checked;
        const is45RightClick = document.getElementById('is45RightClick').checked;
        const isAppleMusicCopyTracklist = document.getElementById('isAppleMusicCopyTracklist').checked;
        const isAppleMusicCopyCover = document.getElementById('isAppleMusicCopyCover').checked;
        const isAppleMusicCopyAnimatedCover = document.getElementById('isAppleMusicCopyAnimatedCover').checked;
        const isAppleMusicCopyLyrics = document.getElementById('isAppleMusicCopyLyrics').checked;
        const isAppleMusicCopyArtist = document.getElementById('isAppleMusicCopyArtist').checked;
        const isAppleMusicCopyCredits = document.getElementById('isAppleMusicCopyCredits').checked;
        const isAppleMusicPopup = document.getElementById('isAppleMusicPopup').checked;
        const isAppleMusicHighlighting = document.getElementById('isAppleMusicHighlighting').checked;
        const isAppleMusicSaveImage = document.getElementById('isAppleMusicSaveImage').checked;
        const isBandcampCopyTracklist = document.getElementById('isBandcampCopyTracklist').checked;
        const isBandcampCopyCover = document.getElementById('isBandcampCopyCover').checked;
        const isBandcampPopup = document.getElementById('isBandcampPopup').checked;
        const isBandcampSaveImage = document.getElementById('isBandcampSaveImage').checked;
        const isDeezerCopyCover = document.getElementById('isDeezerCopyCover').checked;
        const isDeezerCopyArtist = document.getElementById('isDeezerCopyArtist').checked;
        const isDeezerTrack = document.getElementById('isDeezerTrack').checked;
        const isDeezerShowCover = document.getElementById('isDeezerShowCover').checked;
        const isDeezerPopup = document.getElementById('isDeezerPopup').checked;
        const isDeezerPremiumPopup = document.getElementById('isDeezerPremiumPopup').checked;
        const isDeezerSaveImage = document.getElementById('isDeezerSaveImage').checked;
        const isDistroKidCopyCover = document.getElementById('isDistroKidCopyCover').checked;
        const isDistroKidPopup = document.getElementById('isDistroKidPopup').checked;
        const isDistroKidConvertPNG = document.getElementById('isDistroKidConvertPNG').checked;
        const isDistroKidSaveImage = document.getElementById('isDistroKidSaveImage').checked;
        const isDistroKidHostImgBB = document.getElementById('isDistroKidHostImgBB').checked;
        const isDistroKidHostFilestack = document.getElementById('isDistroKidHostFilestack').checked;
        const isSoundCloudCopyCover = document.getElementById('isSoundCloudCopyCover').checked;
        const isSoundCloudPopup = document.getElementById('isSoundCloudPopup').checked;
        const isSoundCloudArtistBanner = document.getElementById('isSoundCloudArtistBanner').checked;
        const isSoundCloudConvertPNG = document.getElementById('isSoundCloudConvertPNG').checked;
        const isSoundCloudSaveImage = document.getElementById('isSoundCloudSaveImage').checked;
        const isSoundCloudHostImgBB = document.getElementById('isSoundCloudHostImgBB').checked;
        const isSoundCloudHostFilestack = document.getElementById('isSoundCloudHostFilestack').checked;
        const isSpotifyCopyTracklist = document.getElementById('isSpotifyCopyTracklist').checked;
        const isSpotifyCopyCover = document.getElementById('isSpotifyCopyCover').checked;
        const isSpotifyCopyArtist = document.getElementById('isSpotifyCopyArtist').checked;
        const isSpotifyPopup = document.getElementById('isSpotifyPopup').checked;
        const isSpotifySidebar = document.getElementById('isSpotifySidebar').checked;
        const isSpotifyRightClick = document.getElementById('isSpotifyRightClick').checked;
        const isSpotifyConvertPNG = document.getElementById('isSpotifyConvertPNG').checked;
        const isSpotifySaveImage = document.getElementById('isSpotifySaveImage').checked;
        const isSpotifyHostImgBB = document.getElementById('isSpotifyHostImgBB').checked;
        const isSpotifyHostFilestack = document.getElementById('isSpotifyHostFilestack').checked;
        const isTidalCopyCover = document.getElementById('isTidalCopyCover').checked;
        const isTidalCopyArtist = document.getElementById('isTidalCopyArtist').checked;
        const isTidalCopyCredits = document.getElementById('isTidalCopyCredits').checked;
        const isTidalPopup = document.getElementById('isTidalPopup').checked;
        const isTidalHighlighting = document.getElementById('isTidalHighlighting').checked;
        const isTidalPremiumPopup = document.getElementById('isTidalPremiumPopup').checked;
        const isTidalConvertPNG = document.getElementById('isTidalConvertPNG').checked;
        const isTidalSaveImage = document.getElementById('isTidalSaveImage').checked;
        const isTidalHostImgBB = document.getElementById('isTidalHostImgBB').checked;
        const isTidalHostFilestack = document.getElementById('isTidalHostFilestack').checked;
        const isYandexMusicCopyCover = document.getElementById('isYandexMusicCopyCover').checked;
        const isYandexMusicPopup = document.getElementById('isYandexMusicPopup').checked;
        const isYandexMusicConvertPNG = document.getElementById('isYandexMusicConvertPNG').checked;
        const isYandexMusicSaveImage = document.getElementById('isYandexMusicSaveImage').checked;
        const isYandexMusicHostImgBB = document.getElementById('isYandexMusicHostImgBB').checked;
        const isYandexMusicHostFilestack = document.getElementById('isYandexMusicHostFilestack').checked;
        const isYouTubeMusicCopyCoverPlaylist = document.getElementById('isYouTubeMusicCopyCoverPlaylist').checked;
        const isYouTubeMusicCopyCoverChannel = document.getElementById('isYouTubeMusicCopyCoverChannel').checked;
        const isYouTubeMusicCopyTracklist = document.getElementById('isYouTubeMusicCopyTracklist').checked;
        const isYouTubeMusicCopyLink = document.getElementById('isYouTubeMusicCopyLink').checked;
        const isYouTubeMusicPopup = document.getElementById('isYouTubeMusicPopup').checked;
        const isYouTubeMusicSaveImage = document.getElementById('isYouTubeMusicSaveImage').checked;

        chrome.storage.local.set({
            isGeniusSongSongPage: isGeniusSongSongPage,
            isGeniusSongSongPageZwsp: isGeniusSongSongPageZwsp,
            isGeniusSongSongPageInfo: isGeniusSongSongPageInfo,
            isGeniusSongSongId: isGeniusSongSongId,
            isGeniusSongCheckIndex: isGeniusSongCheckIndex,
            isGeniusSongFollowButton: isGeniusSongFollowButton,
            isGeniusSongTranslationButton: isGeniusSongTranslationButton,
            isGeniusSongShellyButton: isGeniusSongShellyButton,
            isGeniusSongCleanupMetadataButton: isGeniusSongCleanupMetadataButton,
            isGeniusSongAdvancedJson: isGeniusSongAdvancedJson,
            isGeniusSongLanguageButton: isGeniusSongLanguageButton,
            isGeniusSongCleanupButton: isGeniusSongCleanupButton,
            isGeniusSongSectionsButtons: isGeniusSongSectionsButtons,
            isGeniusSongExpandSectionsButtons: isGeniusSongExpandSectionsButtons,
            isGeniusSongAnnotationsButtons: isGeniusSongAnnotationsButtons,
            isGeniusSongFilterActivity: isGeniusSongFilterActivity,
            isGeniusSongFilterNotifications: isGeniusSongFilterNotifications,
            isGeniusSongSaveFilters: isGeniusSongSaveFilters,
            isGeniusSongFilterFirehose: isGeniusSongFilterFirehose,
            isGeniusSongCopyCover: isGeniusSongCopyCover,
            isGeniusSongAppleMusicPlayer: isGeniusSongAppleMusicPlayer,
            isGeniusSongYouTubePlayer: isGeniusSongYouTubePlayer,
            isGeniusSongSoundCloudPlayer: isGeniusSongSoundCloudPlayer,
            isGeniusSongSpotifyPlayer: isGeniusSongSpotifyPlayer,
            isGeniusSongLyricEditor: isGeniusSongLyricEditor,
            isGeniusSongRenameButtons: isGeniusSongRenameButtons,
            isGeniusAlbumAlbumPage: isGeniusAlbumAlbumPage,
            isGeniusAlbumAlbumPageZwsp: isGeniusAlbumAlbumPageZwsp,
            isGeniusAlbumAlbumPageInfo: isGeniusAlbumAlbumPageInfo,
            isGeniusAlbumAlbumId: isGeniusAlbumAlbumId,
            isGeniusAlbumAlbumPageLyrics: isGeniusAlbumAlbumPageLyrics,
            isGeniusAlbumExpandTracklist: isGeniusAlbumExpandTracklist,
            isGeniusAlbumEditTracklist: isGeniusAlbumEditTracklist,
            isGeniusAlbumUploadCover: isGeniusAlbumUploadCover,
            isGeniusAlbumRenameButtons: isGeniusAlbumRenameButtons,
            isGeniusAlbumSongCreditsButton: isGeniusAlbumSongCreditsButton,
            isGeniusAlbumSongCreditsAutoReopen: isGeniusAlbumSongCreditsAutoReopen,
            isGeniusAlbumFollowButton: isGeniusAlbumFollowButton,
            isGeniusAlbumCleanupButton: isGeniusAlbumCleanupButton,
            isGeniusArtistArtistPage: isGeniusArtistArtistPage,
            isGeniusArtistArtistPageZwsp: isGeniusArtistArtistPageZwsp,
            isGeniusArtistArtistPageInfo: isGeniusArtistArtistPageInfo,
            isGeniusArtistArtistId: isGeniusArtistArtistId,
            isGeniusArtistAllSongsAlbumsPage: isGeniusArtistAllSongsAlbumsPage,
            isGeniusArtistAllSongsAlbumsPageMetadata: isGeniusArtistAllSongsAlbumsPageMetadata,
            isGeniusArtistAllSongsAlbumsPageZwsp: isGeniusArtistAllSongsAlbumsPageZwsp,
            isGeniusArtistFollowButton: isGeniusArtistFollowButton,
            isGeniusArtistSpreadsheetButton: isGeniusArtistSpreadsheetButton,
            isGeniusArtistSearchArtistMetadata: isGeniusArtistSearchArtistMetadata,
            isGeniusArtistBulkAwardIq: isGeniusArtistBulkAwardIq,
            isGeniusArtistRecords: isGeniusArtistRecords,
            isGeniusArtistNewPage: isGeniusArtistNewPage,
            is45CopyCover: is45CopyCover,
            is45Popup: is45Popup,
            is45ConvertPNG: is45ConvertPNG,
            is45SaveImage: is45SaveImage,
            is45HostImgBB: is45HostImgBB,
            is45HostFilestack: is45HostFilestack,
            is45RightClick: is45RightClick,
            isAppleMusicCopyTracklist: isAppleMusicCopyTracklist,
            isAppleMusicCopyCover: isAppleMusicCopyCover,
            isAppleMusicCopyAnimatedCover: isAppleMusicCopyAnimatedCover,
            isAppleMusicCopyLyrics: isAppleMusicCopyLyrics,
            isAppleMusicCopyArtist: isAppleMusicCopyArtist,
            isAppleMusicCopyCredits: isAppleMusicCopyCredits,
            isAppleMusicPopup: isAppleMusicPopup,
            isAppleMusicHighlighting: isAppleMusicHighlighting,
            isAppleMusicSaveImage: isAppleMusicSaveImage,
            isBandcampCopyTracklist: isBandcampCopyTracklist,
            isBandcampCopyCover: isBandcampCopyCover,
            isBandcampPopup: isBandcampPopup,
            isBandcampSaveImage: isBandcampSaveImage,
            isDeezerCopyCover: isDeezerCopyCover,
            isDeezerCopyArtist: isDeezerCopyArtist,
            isDeezerTrack: isDeezerTrack,
            isDeezerShowCover: isDeezerShowCover,
            isDeezerPopup: isDeezerPopup,
            isDeezerPremiumPopup: isDeezerPremiumPopup,
            isDeezerSaveImage: isDeezerSaveImage,
            isDistroKidCopyCover: isDistroKidCopyCover,
            isDistroKidPopup: isDistroKidPopup,
            isDistroKidConvertPNG: isDistroKidConvertPNG,
            isDistroKidSaveImage: isDistroKidSaveImage,
            isDistroKidHostImgBB: isDistroKidHostImgBB,
            isDistroKidHostFilestack: isDistroKidHostFilestack,
            isSoundCloudCopyCover: isSoundCloudCopyCover,
            isSoundCloudPopup: isSoundCloudPopup,
            isSoundCloudArtistBanner: isSoundCloudArtistBanner,
            isSoundCloudConvertPNG: isSoundCloudConvertPNG,
            isSoundCloudSaveImage: isSoundCloudSaveImage,
            isSoundCloudHostImgBB: isSoundCloudHostImgBB,
            isSoundCloudHostFilestack: isSoundCloudHostFilestack,
            isSpotifyCopyTracklist: isSpotifyCopyTracklist,
            isSpotifyCopyCover: isSpotifyCopyCover,
            isSpotifyCopyArtist: isSpotifyCopyArtist,
            isSpotifyPopup: isSpotifyPopup,
            isSpotifySidebar: isSpotifySidebar,
            isSpotifyRightClick: isSpotifyRightClick,
            isSpotifyConvertPNG: isSpotifyConvertPNG,
            isSpotifySaveImage: isSpotifySaveImage,
            isSpotifyHostImgBB: isSpotifyHostImgBB,
            isSpotifyHostFilestack: isSpotifyHostFilestack,
            isTidalCopyCover: isTidalCopyCover,
            isTidalCopyArtist: isTidalCopyArtist,
            isTidalCopyCredits: isTidalCopyCredits,
            isTidalPopup: isTidalPopup,
            isTidalHighlighting: isTidalHighlighting,
            isTidalPremiumPopup: isTidalPremiumPopup,
            isTidalConvertPNG: isTidalConvertPNG,
            isTidalSaveImage: isTidalSaveImage,
            isTidalHostImgBB: isTidalHostImgBB,
            isTidalHostFilestack: isTidalHostFilestack,
            isYandexMusicCopyCover: isYandexMusicCopyCover,
            isYandexMusicPopup: isYandexMusicPopup,
            isYandexMusicConvertPNG: isYandexMusicConvertPNG,
            isYandexMusicSaveImage: isYandexMusicSaveImage,
            isYandexMusicHostImgBB: isYandexMusicHostImgBB,
            isYandexMusicHostFilestack: isYandexMusicHostFilestack,
            isYouTubeMusicCopyCoverPlaylist: isYouTubeMusicCopyCoverPlaylist,
            isYouTubeMusicCopyCoverChannel: isYouTubeMusicCopyCoverChannel,
            isYouTubeMusicCopyTracklist: isYouTubeMusicCopyTracklist,
            isYouTubeMusicCopyLink: isYouTubeMusicCopyLink,
            isYouTubeMusicPopup: isYouTubeMusicPopup,
            isYouTubeMusicSaveImage: isYouTubeMusicSaveImage,
        });
    }

    chrome.storage.local.get([
        'isGeniusSongSongPage', 'isGeniusSongSongPageZwsp', 'isGeniusSongSongPageInfo', 'isGeniusSongSongId', 'isGeniusSongCheckIndex', 'isGeniusSongFollowButton', 'isGeniusSongTranslationButton','isGeniusSongShellyButton', 'isGeniusSongCleanupMetadataButton', 'isGeniusSongLanguageButton', 'isGeniusSongCleanupButton', 'isGeniusSongSectionsButtons', 'isGeniusSongExpandSectionsButtons', 'isGeniusSongAnnotationsButtons', 'isGeniusSongFilterActivity', 'isGeniusSongFilterNotifications', 'isGeniusSongSaveFilters', 'isGeniusSongFilterFirehose','isGeniusSongCopyCover', 'isGeniusSongAppleMusicPlayer', 'isGeniusSongYouTubePlayer', 'isGeniusSongSoundCloudPlayer', 'isGeniusSongSpotifyPlayer', 'isGeniusSongLyricEditor', 'isGeniusSongRenameButtons',
        'isGeniusAlbumAlbumPage', 'isGeniusAlbumAlbumPageZwsp', 'isGeniusAlbumAlbumPageInfo', 'isGeniusAlbumAlbumId', 'isGeniusAlbumAlbumPageLyrics', 'isGeniusAlbumExpandTracklist', 'isGeniusAlbumEditTracklist', 'isGeniusAlbumUploadCover', 'isGeniusAlbumRenameButtons', 'isGeniusAlbumSongCreditsButton', 'isGeniusAlbumSongCreditsAutoReopen', 'isGeniusAlbumFollowButton', 'isGeniusAlbumCleanupButton',
        'isGeniusArtistArtistPage', 'isGeniusArtistArtistPageZwsp', 'isGeniusArtistArtistPageInfo', 'isGeniusArtistArtistId', 'isGeniusArtistAllSongsAlbumsPage', 'isGeniusArtistAllSongsAlbumsPageMetadata', 'isGeniusArtistAllSongsAlbumsPageZwsp', 'isGeniusArtistFollowButton', 'isGeniusArtistSpreadsheetButton', 'isGeniusArtistSearchArtistMetadata', 'isGeniusArtistBulkAwardIq', 'isGeniusArtistRecords', 'isGeniusArtistNewPage',
        'is45CopyCover', 'is45Popup', 'is45ConvertPNG', 'is45SaveImage', 'is45HostImgBB', 'is45HostFilestack', 'is45RightClick',
        'isAppleMusicCopyTracklist', 'isAppleMusicCopyCover', 'isAppleMusicCopyAnimatedCover', 'isAppleMusicCopyLyrics', 'isAppleMusicCopyArtist', 'isAppleMusicCopyCredits', 'isAppleMusicPopup', 'isAppleMusicHighlighting', 'isAppleMusicSaveImage',
        'isBandcampCopyTracklist', 'isBandcampCopyCover', 'isBandcampPopup', 'isBandcampSaveImage',
        'isDeezerCopyCover', 'isDeezerCopyArtist', 'isDeezerTrack', 'isDeezerPopup', 'isDeezerPremiumPopup', 'isDeezerSaveImage',
        'isDistroKidCopyCover', 'isDistroKidPopup', 'isDistroKidConvertPNG', 'isDistroKidSaveImage', 'isDistroKidHostImgBB', 'isDistroKidHostFilestack',
        'isSoundCloudCopyCover', 'isSoundCloudPopup', 'isSoundCloudArtistBanner', 'isSoundCloudConvertPNG', 'isSoundCloudSaveImage', 'isSoundCloudHostImgBB', 'isSoundCloudHostFilestack',
        'isSpotifyCopyTracklist', 'isSpotifyCopyCover', 'isSpotifyCopyArtist', 'isSpotifyPopup', 'isSpotifySidebar', 'isSpotifyRightClick', 'isSpotifyConvertPNG', 'isSpotifySaveImage', 'isSpotifyHostImgBB', 'isSpotifyHostFilestack',
        'isTidalCopyCover', 'isTidalCopyArtist', 'isTidalCopyCredits', 'isTidalPopup', 'isTidalHighlighting', 'isTidalPremiumPopup', 'isTidalConvertPNG', 'isTidalSaveImage', 'isTidalHostImgBB', 'isTidalHostFilestack',
        'isYandexMusicCopyCover', 'isYandexMusicPopup', 'isYandexMusicConvertPNG', 'isYandexMusicSaveImage', 'isYandexMusicHostImgBB', 'isYandexMusicHostFilestack',
        'isYouTubeMusicCopyCoverPlaylist', 'isYouTubeMusicCopyCoverChannel', 'isYouTubeMusicCopyTracklist', 'isYouTubeMusicCopyLink', 'isYouTubeMusicPopup', 'isYouTubeMusicSaveImage',
    ], function (result) {
        document.getElementById('isGeniusSongSongPage').checked = result.isGeniusSongSongPage !== undefined ? result.isGeniusSongSongPage : true;
        document.getElementById('isGeniusSongSongPageZwsp').checked = result.isGeniusSongSongPageZwsp !== undefined ? result.isGeniusSongSongPageZwsp : true;
        document.getElementById('isGeniusSongSongPageInfo').checked = result.isGeniusSongSongPageInfo !== undefined ? result.isGeniusSongSongPageInfo : true;
        document.getElementById('isGeniusSongSongId').checked = result.isGeniusSongSongId !== undefined ? result.isGeniusSongSongId : false;
        document.getElementById('isGeniusSongCheckIndex').checked = result.isGeniusSongCheckIndex !== undefined ? result.isGeniusSongCheckIndex : false;
        document.getElementById('isGeniusSongFollowButton').checked = result.isGeniusSongFollowButton !== undefined ? result.isGeniusSongFollowButton : true;
        document.getElementById('isGeniusSongTranslationButton').checked = result.isGeniusSongTranslationButton !== undefined ? result.isGeniusSongTranslationButton : true;
        document.getElementById('isGeniusSongShellyButton').checked = result.isGeniusSongShellyButton !== undefined ? result.isGeniusSongShellyButton : true;
        document.getElementById('isGeniusSongCleanupMetadataButton').checked = result.isGeniusSongCleanupMetadataButton !== undefined ? result.isGeniusSongCleanupMetadataButton : true;
        document.getElementById('isGeniusSongAdvancedJson').checked = result.isGeniusSongAdvancedJson !== undefined ? result.isGeniusSongAdvancedJson : true;
        document.getElementById('isGeniusSongLanguageButton').checked = result.isGeniusSongLanguageButton !== undefined ? result.isGeniusSongLanguageButton : true;
        document.getElementById('isGeniusSongCleanupButton').checked = result.isGeniusSongCleanupButton !== undefined ? result.isGeniusSongCleanupButton : true;
        document.getElementById('isGeniusSongSectionsButtons').checked = result.isGeniusSongSectionsButtons !== undefined ? result.isGeniusSongSectionsButtons : true;
        document.getElementById('isGeniusSongExpandSectionsButtons').checked = result.isGeniusSongExpandSectionsButtons !== undefined ? result.isGeniusSongExpandSectionsButtons : false;
        document.getElementById('isGeniusSongAnnotationsButtons').checked = result.isGeniusSongAnnotationsButtons !== undefined ? result.isGeniusSongAnnotationsButtons : true;
        document.getElementById('isGeniusSongFilterActivity').checked = result.isGeniusSongFilterActivity !== undefined ? result.isGeniusSongFilterActivity : true;
        document.getElementById('isGeniusSongFilterNotifications').checked = result.isGeniusSongFilterNotifications !== undefined ? result.isGeniusSongFilterNotifications : true;
        document.getElementById('isGeniusSongSaveFilters').checked = result.isGeniusSongSaveFilters !== undefined ? result.isGeniusSongSaveFilters : false;
        document.getElementById('isGeniusSongFilterFirehose').checked = result.isGeniusSongFilterFirehose !== undefined ? result.isGeniusSongFilterFirehose : true;
        document.getElementById('isGeniusSongCopyCover').checked = result.isGeniusSongCopyCover !== undefined ? result.isGeniusSongCopyCover : true;
        document.getElementById('isGeniusSongAppleMusicPlayer').checked = result.isGeniusSongAppleMusicPlayer !== undefined ? result.isGeniusSongAppleMusicPlayer : true;
        document.getElementById('isGeniusSongYouTubePlayer').checked = result.isGeniusSongYouTubePlayer !== undefined ? result.isGeniusSongYouTubePlayer : true;
        document.getElementById('isGeniusSongSoundCloudPlayer').checked = result.isGeniusSongSoundCloudPlayer !== undefined ? result.isGeniusSongSoundCloudPlayer : true;
        document.getElementById('isGeniusSongSpotifyPlayer').checked = result.isGeniusSongSpotifyPlayer !== undefined ? result.isGeniusSongSpotifyPlayer : true;
        document.getElementById('isGeniusSongLyricEditor').checked = result.isGeniusSongLyricEditor !== undefined ? result.isGeniusSongLyricEditor : true;
        document.getElementById('isGeniusSongRenameButtons').checked = result.isGeniusSongRenameButtons !== undefined ? result.isGeniusSongRenameButtons : true;
        document.getElementById('isGeniusAlbumAlbumPage').checked = result.isGeniusAlbumAlbumPage !== undefined ? result.isGeniusAlbumAlbumPage : true;
        document.getElementById('isGeniusAlbumAlbumPageZwsp').checked = result.isGeniusAlbumAlbumPageZwsp !== undefined ? result.isGeniusAlbumAlbumPageZwsp : true;
        document.getElementById('isGeniusAlbumAlbumPageInfo').checked = result.isGeniusAlbumAlbumPageInfo !== undefined ? result.isGeniusAlbumAlbumPageInfo : true;
        document.getElementById('isGeniusAlbumAlbumId').checked = result.isGeniusAlbumAlbumId !== undefined ? result.isGeniusAlbumAlbumId : true;
        document.getElementById('isGeniusAlbumAlbumPageLyrics').checked = result.isGeniusAlbumAlbumPageLyrics !== undefined ? result.isGeniusAlbumAlbumPageLyrics : false;
        document.getElementById('isGeniusAlbumExpandTracklist').checked = result.isGeniusAlbumExpandTracklist !== undefined ? result.isGeniusAlbumExpandTracklist : true;
        document.getElementById('isGeniusAlbumEditTracklist').checked = result.isGeniusAlbumEditTracklist !== undefined ? result.isGeniusAlbumEditTracklist : true;
        document.getElementById('isGeniusAlbumUploadCover').checked = result.isGeniusAlbumUploadCover !== undefined ? result.isGeniusAlbumUploadCover : false;
        document.getElementById('isGeniusAlbumRenameButtons').checked = result.isGeniusAlbumRenameButtons !== undefined ? result.isGeniusAlbumRenameButtons : true;
        document.getElementById('isGeniusAlbumSongCreditsButton').checked = result.isGeniusAlbumSongCreditsButton !== undefined ? result.isGeniusAlbumSongCreditsButton : true;
        document.getElementById('isGeniusAlbumSongCreditsAutoReopen').checked = result.isGeniusAlbumSongCreditsAutoReopen !== undefined ? result.isGeniusAlbumSongCreditsAutoReopen : false;
        document.getElementById('isGeniusAlbumFollowButton').checked = result.isGeniusAlbumFollowButton !== undefined ? result.isGeniusAlbumFollowButton : true;
        document.getElementById('isGeniusAlbumCleanupButton').checked = result.isGeniusAlbumCleanupButton !== undefined ? result.isGeniusAlbumCleanupButton : true;
        document.getElementById('isGeniusArtistArtistPage').checked = result.isGeniusArtistArtistPage !== undefined ? result.isGeniusArtistArtistPage : true;
        document.getElementById('isGeniusArtistArtistPageZwsp').checked = result.isGeniusArtistArtistPageZwsp !== undefined ? result.isGeniusArtistArtistPageZwsp : true;
        document.getElementById('isGeniusArtistArtistPageInfo').checked = result.isGeniusArtistArtistPageInfo !== undefined ? result.isGeniusArtistArtistPageInfo : true;
        document.getElementById('isGeniusArtistArtistId').checked = result.isGeniusArtistArtistId !== undefined ? result.isGeniusArtistArtistId : false;
        document.getElementById('isGeniusArtistAllSongsAlbumsPage').checked = result.isGeniusArtistAllSongsAlbumsPage !== undefined ? result.isGeniusArtistAllSongsAlbumsPage : true;
        document.getElementById('isGeniusArtistAllSongsAlbumsPageMetadata').checked = result.isGeniusArtistAllSongsAlbumsPageMetadata !== undefined ? result.isGeniusArtistAllSongsAlbumsPageMetadata : true;
        document.getElementById('isGeniusArtistAllSongsAlbumsPageZwsp').checked = result.isGeniusArtistAllSongsAlbumsPageZwsp !== undefined ? result.isGeniusArtistAllSongsAlbumsPageZwsp : true;
        document.getElementById('isGeniusArtistFollowButton').checked = result.isGeniusArtistFollowButton !== undefined ? result.isGeniusArtistFollowButton : false;
        document.getElementById('isGeniusArtistSpreadsheetButton').checked = result.isGeniusArtistSpreadsheetButton !== undefined ? result.isGeniusArtistSpreadsheetButton : false;
        document.getElementById('isGeniusArtistSearchArtistMetadata').checked = result.isGeniusArtistSearchArtistMetadata !== undefined ? result.isGeniusArtistSearchArtistMetadata : true;
        document.getElementById('isGeniusArtistBulkAwardIq').checked = result.isGeniusArtistBulkAwardIq !== undefined ? result.isGeniusArtistBulkAwardIq : true;
        document.getElementById('isGeniusArtistRecords').checked = result.isGeniusArtistRecords !== undefined ? result.isGeniusArtistRecords : true;
        document.getElementById('isGeniusArtistNewPage').checked = result.isGeniusArtistNewPage !== undefined ? result.isGeniusArtistNewPage : true;
        document.getElementById('is45CopyCover').checked = result.is45CopyCover !== undefined ? result.is45CopyCover : true;
        document.getElementById('is45Popup').checked = result.is45Popup !== undefined ? result.is45Popup : true;
        document.getElementById('is45ConvertPNG').checked = result.is45ConvertPNG !== undefined ? result.is45ConvertPNG : true;
        document.getElementById('is45SaveImage').checked = result.is45SaveImage !== undefined ? result.is45SaveImage : false;
        document.getElementById('is45HostImgBB').checked = result.is45HostImgBB !== undefined ? result.is45HostImgBB : true;
        document.getElementById('is45HostFilestack').checked = result.is45HostFilestack !== undefined ? result.is45HostFilestack : false;
        document.getElementById('is45RightClick').checked = result.is45RightClick !== undefined ? result.is45RightClick : true;
        document.getElementById('isAppleMusicCopyTracklist').checked = result.isAppleMusicCopyTracklist !== undefined ? result.isAppleMusicCopyTracklist : true;
        document.getElementById('isAppleMusicCopyCover').checked = result.isAppleMusicCopyCover !== undefined ? result.isAppleMusicCopyCover : true;
        document.getElementById('isAppleMusicCopyAnimatedCover').checked = result.isAppleMusicCopyAnimatedCover !== undefined ? result.isAppleMusicCopyAnimatedCover : true;
        document.getElementById('isAppleMusicCopyLyrics').checked = result.isAppleMusicCopyLyrics !== undefined ? result.isAppleMusicCopyLyrics : false;
        document.getElementById('isAppleMusicCopyArtist').checked = result.isAppleMusicCopyArtist !== undefined ? result.isAppleMusicCopyArtist : true;
        document.getElementById('isAppleMusicCopyCredits').checked = result.isAppleMusicCopyCredits !== undefined ? result.isAppleMusicCopyCredits : true;
        document.getElementById('isAppleMusicPopup').checked = result.isAppleMusicPopup !== undefined ? result.isAppleMusicPopup : true;
        document.getElementById('isAppleMusicHighlighting').checked = result.isAppleMusicHighlighting !== undefined ? result.isAppleMusicHighlighting : true;
        document.getElementById('isAppleMusicSaveImage').checked = result.isAppleMusicSaveImage !== undefined ? result.isAppleMusicSaveImage : false;
        document.getElementById('isBandcampCopyTracklist').checked = result.isBandcampCopyTracklist !== undefined ? result.isBandcampCopyTracklist : true;
        document.getElementById('isBandcampCopyCover').checked = result.isBandcampCopyCover !== undefined ? result.isBandcampCopyCover : true;
        document.getElementById('isBandcampPopup').checked = result.isBandcampPopup !== undefined ? result.isBandcampPopup : true;
        document.getElementById('isBandcampSaveImage').checked = result.isBandcampSaveImage !== undefined ? result.isBandcampSaveImage : false;
        document.getElementById('isDeezerCopyCover').checked = result.isDeezerCopyCover !== undefined ? result.isDeezerCopyCover : true;
        document.getElementById('isDeezerCopyArtist').checked = result.isDeezerCopyArtist !== undefined ? result.isDeezerCopyArtist : true;
        document.getElementById('isDeezerTrack').checked = result.isDeezerTrack !== undefined ? result.isDeezerTrack : true;
        document.getElementById('isDeezerShowCover').checked = result.isDeezerShowCover !== undefined ? result.isDeezerShowCover : true;
        document.getElementById('isDeezerPopup').checked = result.isDeezerPopup !== undefined ? result.isDeezerPopup : true;
        document.getElementById('isDeezerPremiumPopup').checked = result.isDeezerPremiumPopup !== undefined ? result.isDeezerPremiumPopup : false;
        document.getElementById('isDeezerSaveImage').checked = result.isDeezerSaveImage !== undefined ? result.isDeezerSaveImage : false;
        document.getElementById('isDistroKidCopyCover').checked = result.isDistroKidCopyCover !== undefined ? result.isDistroKidCopyCover : true;
        document.getElementById('isDistroKidPopup').checked = result.isDistroKidPopup !== undefined ? result.isDistroKidPopup : true;
        document.getElementById('isDistroKidConvertPNG').checked = result.isDistroKidConvertPNG !== undefined ? result.isDistroKidConvertPNG : true;
        document.getElementById('isDistroKidSaveImage').checked = result.isDistroKidSaveImage !== undefined ? result.isDistroKidSaveImage : false;
        document.getElementById('isDistroKidHostImgBB').checked = result.isDistroKidHostImgBB !== undefined ? result.isDistroKidHostImgBB : false;
        document.getElementById('isDistroKidHostFilestack').checked = result.isDistroKidHostFilestack !== undefined ? result.isDistroKidHostFilestack : true;
        document.getElementById('isSoundCloudCopyCover').checked = result.isSoundCloudCopyCover !== undefined ? result.isSoundCloudCopyCover : true;
        document.getElementById('isSoundCloudPopup').checked = result.isSoundCloudPopup !== undefined ? result.isSoundCloudPopup : true;
        document.getElementById('isSoundCloudArtistBanner').checked = result.isSoundCloudArtistBanner !== undefined ? result.isSoundCloudArtistBanner : false;
        document.getElementById('isSoundCloudConvertPNG').checked = result.isSoundCloudConvertPNG !== undefined ? result.isSoundCloudConvertPNG : true;
        document.getElementById('isSoundCloudSaveImage').checked = result.isSoundCloudSaveImage !== undefined ? result.isSoundCloudSaveImage : false;
        document.getElementById('isSoundCloudHostImgBB').checked = result.isSoundCloudHostImgBB !== undefined ? result.isSoundCloudHostImgBB : false;
        document.getElementById('isSoundCloudHostFilestack').checked = result.isSoundCloudHostFilestack !== undefined ? result.isSoundCloudHostFilestack : true;
        document.getElementById('isSpotifyCopyTracklist').checked = result.isSpotifyCopyTracklist !== undefined ? result.isSpotifyCopyTracklist : true;
        document.getElementById('isSpotifyCopyCover').checked = result.isSpotifyCopyCover !== undefined ? result.isSpotifyCopyCover : true;
        document.getElementById('isSpotifyCopyArtist').checked = result.isSpotifyCopyArtist !== undefined ? result.isSpotifyCopyArtist : true;
        document.getElementById('isSpotifyPopup').checked = result.isSpotifyPopup !== undefined ? result.isSpotifyPopup : true;
        document.getElementById('isSpotifySidebar').checked = result.isSpotifySidebar !== undefined ? result.isSpotifySidebar : false;
        document.getElementById('isSpotifyRightClick').checked = result.isSpotifyRightClick !== undefined ? result.isSpotifyRightClick : false;
        document.getElementById('isSpotifyConvertPNG').checked = result.isSpotifyConvertPNG !== undefined ? result.isSpotifyConvertPNG : true;
        document.getElementById('isSpotifySaveImage').checked = result.isSpotifySaveImage !== undefined ? result.isSpotifySaveImage : false;
        document.getElementById('isSpotifyHostImgBB').checked = result.isSpotifyHostImgBB !== undefined ? result.isSpotifyHostImgBB : false;
        document.getElementById('isSpotifyHostFilestack').checked = result.isSpotifyHostFilestack !== undefined ? result.isSpotifyHostFilestack : true;
        document.getElementById('isTidalCopyCover').checked = result.isTidalCopyCover !== undefined ? result.isTidalCopyCover : true;
        document.getElementById('isTidalCopyArtist').checked = result.isTidalCopyArtist !== undefined ? result.isTidalCopyArtist : true;
        document.getElementById('isTidalCopyCredits').checked = result.isTidalCopyCredits !== undefined ? result.isTidalCopyCredits : true;
        document.getElementById('isTidalPopup').checked = result.isTidalPopup !== undefined ? result.isTidalPopup : true;
        document.getElementById('isTidalHighlighting').checked = result.isTidalHighlighting !== undefined ? result.isTidalHighlighting : true;
        document.getElementById('isTidalPremiumPopup').checked = result.isTidalPremiumPopup !== undefined ? result.isTidalPremiumPopup : false;
        document.getElementById('isTidalConvertPNG').checked = result.isTidalConvertPNG !== undefined ? result.isTidalConvertPNG : true;
        document.getElementById('isTidalSaveImage').checked = result.isTidalSaveImage !== undefined ? result.isTidalSaveImage : false;
        document.getElementById('isTidalHostImgBB').checked = result.isTidalHostImgBB !== undefined ? result.isTidalHostImgBB : false;
        document.getElementById('isTidalHostFilestack').checked = result.isTidalHostFilestack !== undefined ? result.isTidalHostFilestack : true;
        document.getElementById('isYandexMusicCopyCover').checked = result.isYandexMusicCopyCover !== undefined ? result.isYandexMusicCopyCover : true;
        document.getElementById('isYandexMusicPopup').checked = result.isYandexMusicPopup !== undefined ? result.isYandexMusicPopup : true;
        document.getElementById('isYandexMusicConvertPNG').checked = result.isYandexMusicConvertPNG !== undefined ? result.isYandexMusicConvertPNG : false;
        document.getElementById('isYandexMusicSaveImage').checked = result.isYandexMusicSaveImage !== undefined ? result.isYandexMusicSaveImage : false;
        document.getElementById('isYandexMusicHostImgBB').checked = result.isYandexMusicHostImgBB !== undefined ? result.isYandexMusicHostImgBB : true;
        document.getElementById('isYandexMusicHostFilestack').checked = result.isYandexMusicHostFilestack !== undefined ? result.isYandexMusicHostFilestack : false;
        document.getElementById('isYouTubeMusicCopyCoverPlaylist').checked = result.isYouTubeMusicCopyCoverPlaylist !== undefined ? result.isYouTubeMusicCopyCoverPlaylist : true;
        document.getElementById('isYouTubeMusicCopyCoverChannel').checked = result.isYouTubeMusicCopyCoverChannel !== undefined ? result.isYouTubeMusicCopyCoverChannel : true;
        document.getElementById('isYouTubeMusicCopyTracklist').checked = result.isYouTubeMusicCopyTracklist !== undefined ? result.isYouTubeMusicCopyTracklist : true;
        document.getElementById('isYouTubeMusicCopyLink').checked = result.isYouTubeMusicCopyLink !== undefined ? result.isYouTubeMusicCopyLink : true;
        document.getElementById('isYouTubeMusicPopup').checked = result.isYouTubeMusicPopup !== undefined ? result.isYouTubeMusicPopup : true;
        document.getElementById('isYouTubeMusicSaveImage').checked = result.isYouTubeMusicSaveImage !== undefined ? result.isYouTubeMusicSaveImage : false;
    });

    document.getElementById("saveMetadataButton").addEventListener("click", saveOrder);
    document.getElementById('isGeniusSongSongPage').addEventListener('change', saveSettings);
    document.getElementById('isGeniusSongSongPageZwsp').addEventListener('change', saveSettings);
    document.getElementById('isGeniusSongSongPageInfo').addEventListener('change', saveSettings);
    document.getElementById('isGeniusSongSongId').addEventListener('change', saveSettings);
    document.getElementById('isGeniusSongCheckIndex').addEventListener('change', saveSettings);
    document.getElementById('isGeniusSongFollowButton').addEventListener('change', saveSettings);
    document.getElementById('isGeniusSongTranslationButton').addEventListener('change', saveSettings);
    document.getElementById('isGeniusSongShellyButton').addEventListener('change', saveSettings);
    document.getElementById('isGeniusSongCleanupMetadataButton').addEventListener('change', saveSettings);
    document.getElementById('isGeniusSongAdvancedJson').addEventListener('change', saveSettings);
    document.getElementById('isGeniusSongLanguageButton').addEventListener('change', saveSettings);
    document.getElementById('isGeniusSongCleanupButton').addEventListener('change', saveSettings);
    document.getElementById('isGeniusSongSectionsButtons').addEventListener('change', saveSettings);
    document.getElementById('isGeniusSongExpandSectionsButtons').addEventListener('change', saveSettings);
    document.getElementById('isGeniusSongAnnotationsButtons').addEventListener('change', saveSettings);
    document.getElementById('isGeniusSongFilterActivity').addEventListener('change', saveSettings);
    document.getElementById('isGeniusSongFilterNotifications').addEventListener('change', saveSettings);
    document.getElementById('isGeniusSongSaveFilters').addEventListener('change', saveSettings);
    document.getElementById('isGeniusSongFilterFirehose').addEventListener('change', saveSettings);
    document.getElementById('isGeniusSongCopyCover').addEventListener('change', saveSettings);
    document.getElementById('isGeniusSongAppleMusicPlayer').addEventListener('change', saveSettings);
    document.getElementById('isGeniusSongYouTubePlayer').addEventListener('change', saveSettings);
    document.getElementById('isGeniusSongSoundCloudPlayer').addEventListener('change', saveSettings);
    document.getElementById('isGeniusSongSpotifyPlayer').addEventListener('change', saveSettings);
    document.getElementById('isGeniusSongLyricEditor').addEventListener('change', saveSettings);
    document.getElementById('isGeniusSongRenameButtons').addEventListener('change', saveSettings);
    document.getElementById('isGeniusAlbumAlbumPage').addEventListener('change', saveSettings);
    document.getElementById('isGeniusAlbumAlbumPageZwsp').addEventListener('change', saveSettings);
    document.getElementById('isGeniusAlbumAlbumPageInfo').addEventListener('change', saveSettings);
    document.getElementById('isGeniusAlbumAlbumId').addEventListener('change', saveSettings);
    document.getElementById('isGeniusAlbumAlbumPageLyrics').addEventListener('change', saveSettings);
    document.getElementById('isGeniusAlbumExpandTracklist').addEventListener('change', saveSettings);
    document.getElementById('isGeniusAlbumEditTracklist').addEventListener('change', saveSettings);
    document.getElementById('isGeniusAlbumUploadCover').addEventListener('change', saveSettings);
    document.getElementById('isGeniusAlbumRenameButtons').addEventListener('change', saveSettings);
    document.getElementById('isGeniusAlbumSongCreditsButton').addEventListener('change', saveSettings);
    document.getElementById('isGeniusAlbumSongCreditsAutoReopen').addEventListener('change', saveSettings);
    document.getElementById('isGeniusAlbumFollowButton').addEventListener('change', saveSettings);
    document.getElementById('isGeniusAlbumCleanupButton').addEventListener('change', saveSettings);
    document.getElementById('isGeniusArtistArtistPage').addEventListener('change', saveSettings);
    document.getElementById('isGeniusArtistAllSongsAlbumsPageMetadata').addEventListener('change', saveSettings);
    document.getElementById('isGeniusArtistArtistPageZwsp').addEventListener('change', saveSettings);
    document.getElementById('isGeniusArtistArtistPageInfo').addEventListener('change', saveSettings);
    document.getElementById('isGeniusArtistArtistId').addEventListener('change', saveSettings);
    document.getElementById('isGeniusArtistAllSongsAlbumsPage').addEventListener('change', saveSettings);
    document.getElementById('isGeniusArtistAllSongsAlbumsPageZwsp').addEventListener('change', saveSettings);
    document.getElementById('isGeniusArtistFollowButton').addEventListener('change', saveSettings);
    document.getElementById('isGeniusArtistSpreadsheetButton').addEventListener('change', saveSettings);
    document.getElementById('isGeniusArtistSearchArtistMetadata').addEventListener('change', saveSettings);
    document.getElementById('isGeniusArtistBulkAwardIq').addEventListener('change', saveSettings);
    document.getElementById('isGeniusArtistRecords').addEventListener('change', saveSettings);
    document.getElementById('isGeniusArtistNewPage').addEventListener('change', saveSettings);
    document.getElementById('is45CopyCover').addEventListener('change', saveSettings);
    document.getElementById('is45Popup').addEventListener('change', saveSettings);
    document.getElementById('is45ConvertPNG').addEventListener('change', saveSettings);
    document.getElementById('is45SaveImage').addEventListener('change', saveSettings);
    document.getElementById('is45HostImgBB').addEventListener('change', saveSettings);
    document.getElementById('is45HostFilestack').addEventListener('change', saveSettings);
    document.getElementById('is45RightClick').addEventListener('change', saveSettings);
    document.getElementById('isAppleMusicCopyTracklist').addEventListener('change', saveSettings);
    document.getElementById('isAppleMusicCopyCover').addEventListener('change', saveSettings);
    document.getElementById('isAppleMusicCopyAnimatedCover').addEventListener('change', saveSettings);
    document.getElementById('isAppleMusicCopyLyrics').addEventListener('change', saveSettings);
    document.getElementById('isAppleMusicCopyArtist').addEventListener('change', saveSettings);
    document.getElementById('isAppleMusicCopyCredits').addEventListener('change', saveSettings);
    document.getElementById('isAppleMusicPopup').addEventListener('change', saveSettings);
    document.getElementById('isAppleMusicHighlighting').addEventListener('change', saveSettings);
    document.getElementById('isAppleMusicSaveImage').addEventListener('change', saveSettings);
    document.getElementById('isBandcampCopyTracklist').addEventListener('change', saveSettings);
    document.getElementById('isBandcampCopyCover').addEventListener('change', saveSettings);
    document.getElementById('isBandcampPopup').addEventListener('change', saveSettings);
    document.getElementById('isBandcampSaveImage').addEventListener('change', saveSettings);
    document.getElementById('isDeezerCopyCover').addEventListener('change', saveSettings);
    document.getElementById('isDeezerCopyArtist').addEventListener('change', saveSettings);
    document.getElementById('isDeezerTrack').addEventListener('change', saveSettings);
    document.getElementById('isDeezerShowCover').addEventListener('change', saveSettings);
    document.getElementById('isDeezerPopup').addEventListener('change', saveSettings);
    document.getElementById('isDeezerPremiumPopup').addEventListener('change', saveSettings);
    document.getElementById('isDeezerSaveImage').addEventListener('change', saveSettings);
    document.getElementById('isDistroKidCopyCover').addEventListener('change', saveSettings);
    document.getElementById('isDistroKidPopup').addEventListener('change', saveSettings);
    document.getElementById('isDistroKidConvertPNG').addEventListener('change', saveSettings);
    document.getElementById('isDistroKidSaveImage').addEventListener('change', saveSettings);
    document.getElementById('isDistroKidHostImgBB').addEventListener('change', saveSettings);
    document.getElementById('isDistroKidHostFilestack').addEventListener('change', saveSettings);
    document.getElementById('isSoundCloudCopyCover').addEventListener('change', saveSettings);
    document.getElementById('isSoundCloudPopup').addEventListener('change', saveSettings);
    document.getElementById('isSoundCloudArtistBanner').addEventListener('change', saveSettings);
    document.getElementById('isSoundCloudConvertPNG').addEventListener('change', saveSettings);
    document.getElementById('isSoundCloudSaveImage').addEventListener('change', saveSettings);
    document.getElementById('isSoundCloudHostImgBB').addEventListener('change', saveSettings);
    document.getElementById('isSoundCloudHostFilestack').addEventListener('change', saveSettings);
    document.getElementById('isSpotifyCopyTracklist').addEventListener('change', saveSettings);
    document.getElementById('isSpotifyCopyCover').addEventListener('change', saveSettings);
    document.getElementById('isSpotifyCopyArtist').addEventListener('change', saveSettings);
    document.getElementById('isSpotifyPopup').addEventListener('change', saveSettings);
    document.getElementById('isSpotifySidebar').addEventListener('change', saveSettings);
    document.getElementById('isSpotifyRightClick').addEventListener('change', saveSettings);
    document.getElementById('isSpotifyConvertPNG').addEventListener('change', saveSettings);
    document.getElementById('isSpotifySaveImage').addEventListener('change', saveSettings);
    document.getElementById('isSpotifyHostImgBB').addEventListener('change', saveSettings);
    document.getElementById('isSpotifyHostFilestack').addEventListener('change', saveSettings);
    document.getElementById('isTidalCopyCover').addEventListener('change', saveSettings);
    document.getElementById('isTidalCopyArtist').addEventListener('change', saveSettings);
    document.getElementById('isTidalCopyCredits').addEventListener('change', saveSettings);
    document.getElementById('isTidalPopup').addEventListener('change', saveSettings);
    document.getElementById('isTidalHighlighting').addEventListener('change', saveSettings);
    document.getElementById('isTidalPremiumPopup').addEventListener('change', saveSettings);
    document.getElementById('isTidalConvertPNG').addEventListener('change', saveSettings);
    document.getElementById('isTidalSaveImage').addEventListener('change', saveSettings);
    document.getElementById('isTidalHostImgBB').addEventListener('change', saveSettings);
    document.getElementById('isTidalHostFilestack').addEventListener('change', saveSettings);
    document.getElementById('isYandexMusicCopyCover').addEventListener('change', saveSettings);
    document.getElementById('isYandexMusicPopup').addEventListener('change', saveSettings);
    document.getElementById('isYandexMusicConvertPNG').addEventListener('change', saveSettings);
    document.getElementById('isYandexMusicSaveImage').addEventListener('change', saveSettings);
    document.getElementById('isYandexMusicHostImgBB').addEventListener('change', saveSettings);
    document.getElementById('isYandexMusicHostFilestack').addEventListener('change', saveSettings);
    document.getElementById('isYouTubeMusicCopyCoverPlaylist').addEventListener('change', saveSettings);
    document.getElementById('isYouTubeMusicCopyCoverChannel').addEventListener('change', saveSettings);
    document.getElementById('isYouTubeMusicCopyTracklist').addEventListener('change', saveSettings);
    document.getElementById('isYouTubeMusicCopyLink').addEventListener('change', saveSettings);
    document.getElementById('isYouTubeMusicPopup').addEventListener('change', saveSettings);
    document.getElementById('isYouTubeMusicSaveImage').addEventListener('change', saveSettings);
});


// Genius Bulk Award Transcription IQ Logic
const PROVIDED_SONGS_LIST = [
  {
    "artist": "255 & Victony",
    "title": "A Lot",
    "url": "https://genius.com/255-and-victony-a-lot-lyrics"
  },
  {
    "artist": "ARI LEE",
    "title": "Obligation",
    "url": "https://genius.com/Ari-lee-obligation-lyrics"
  },
  {
    "artist": "Abstraktt & Oladapo",
    "title": "Odeshi",
    "url": "https://genius.com/Abstraktt-and-oladapo-odeshi-lyrics"
  },
  {
    "artist": "Al Xapo, Benzoo, Shallipopi & EeQue",
    "title": "SNOKONOKO II",
    "url": "https://genius.com/Al-xapo-benzoo-shallipopi-and-eeque-snokonoko-ii-lyrics"
  },
  {
    "artist": "Alex Mather",
    "title": "SOMETIMES I\u2019M WRONG",
    "url": "https://genius.com/Alex-mather-sometimes-im-wrong-lyrics"
  },
  {
    "artist": "Ali (St. Lunatics)",
    "title": "Passin\u2019 Me By",
    "url": "https://genius.com/Ali-st-lunatics-passin-me-by-lyrics"
  },
  {
    "artist": "Ang\u00e9lique Kidjo",
    "title": "No Stopping Us",
    "url": "https://genius.com/Angelique-kidjo-no-stopping-us-lyrics"
  },
  {
    "artist": "Ang\u00e9lique Kidjo",
    "title": "Oyaya",
    "url": "https://genius.com/Angelique-kidjo-oyaya-lyrics"
  },
  {
    "artist": "Ang\u00e9lique Kidjo",
    "title": "I\u2019m On Fire",
    "url": "https://genius.com/Angelique-kidjo-im-on-fire-lyrics"
  },
  {
    "artist": "Ang\u00e9lique Kidjo",
    "title": "You Can",
    "url": "https://genius.com/Angelique-kidjo-you-can-lyrics"
  },
  {
    "artist": "Ang\u00e9lique Kidjo",
    "title": "For Me",
    "url": "https://genius.com/Angelique-kidjo-for-me-lyrics"
  },
  {
    "artist": "Ang\u00e9lique Kidjo",
    "title": "Big Heart",
    "url": "https://genius.com/Angelique-kidjo-big-heart-lyrics"
  },
  {
    "artist": "Anointed",
    "title": "Gonna Lift Your Name (Remix)",
    "url": "https://genius.com/Anointed-gonna-lift-your-name-remix-lyrics"
  },
  {
    "artist": "Anti World Gangstars, FATBOY E, Reeplay, ODUMODUBLVCK, SHAGBA & HOTYCE",
    "title": "Antiworld",
    "url": "https://genius.com/Anti-world-gangstars-fatboy-e-reeplay-odumodublvck-shagba-and-hotyce-antiworld-lyrics"
  },
  {
    "artist": "B.J. Thomas",
    "title": "Bright Nights",
    "url": "https://genius.com/Bj-thomas-bright-nights-lyrics"
  },
  {
    "artist": "BU Double",
    "title": "Bussin\u2019",
    "url": "https://genius.com/Bu-double-bussin-lyrics"
  },
  {
    "artist": "Bassline Club Vibes & Club Winners",
    "title": "Holdin Me",
    "url": "https://genius.com/Bassline-club-vibes-and-club-winners-holdin-me-lyrics"
  },
  {
    "artist": "Betty Jean Robinson",
    "title": "Someone To Care",
    "url": "https://genius.com/Betty-jean-robinson-someone-to-care-lyrics"
  },
  {
    "artist": "Blaqbonez",
    "title": "IKEBE*",
    "url": "https://genius.com/Blaqbonez-ikebe-lyrics"
  },
  {
    "artist": "Blu & August Fanon",
    "title": "Dance",
    "url": "https://genius.com/Blu-and-august-fanon-dance-lyrics"
  },
  {
    "artist": "Bluenax & Amarni (NGA)",
    "title": "INDIAN AMAPIANO",
    "url": "https://genius.com/Bluenax-and-amarni-nga-indian-amapiano-lyrics"
  },
  {
    "artist": "Boj & NO11",
    "title": "Understand Me",
    "url": "https://genius.com/Boj-and-no11-understand-me-lyrics"
  },
  {
    "artist": "CDQ & Islambo",
    "title": "Labubu",
    "url": "https://genius.com/Cdq-and-islambo-labubu-lyrics"
  },
  {
    "artist": "Caitlin and Brent & Brent Amaker & The Rodeo",
    "title": "Victimless Crime",
    "url": "https://genius.com/Caitlin-and-brent-and-brent-amaker-and-the-rodeo-victimless-crime-lyrics"
  },
  {
    "artist": "Caitlin and Brent & Brent Amaker & The Rodeo",
    "title": "Silver Screen",
    "url": "https://genius.com/Caitlin-and-brent-and-brent-amaker-and-the-rodeo-silver-screen-lyrics"
  },
  {
    "artist": "Caitlin and Brent & Brent Amaker & The Rodeo",
    "title": "Nightcall",
    "url": "https://genius.com/Caitlin-and-brent-and-brent-amaker-and-the-rodeo-nightcall-lyrics"
  },
  {
    "artist": "Caitlin and Brent & Brent Amaker & The Rodeo",
    "title": "Pleasure In The Pain",
    "url": "https://genius.com/Caitlin-and-brent-and-brent-amaker-and-the-rodeo-pleasure-in-the-pain-lyrics"
  },
  {
    "artist": "Caitlin and Brent & Brent Amaker & The Rodeo",
    "title": "Intoxicated",
    "url": "https://genius.com/Caitlin-and-brent-and-brent-amaker-and-the-rodeo-intoxicated-lyrics"
  },
  {
    "artist": "Caitlin and Brent & Brent Amaker & The Rodeo",
    "title": "Come Out And Play",
    "url": "https://genius.com/Caitlin-and-brent-and-brent-amaker-and-the-rodeo-come-out-and-play-lyrics"
  },
  {
    "artist": "Carl & Pearl Butler",
    "title": "I\u2019m So Afraid Of Losing You Again",
    "url": "https://genius.com/Carl-and-pearl-butler-im-so-afraid-of-losing-you-again-lyrics"
  },
  {
    "artist": "Carl & Pearl Butler",
    "title": "Paul\u2019s Saloon",
    "url": "https://genius.com/Carl-and-pearl-butler-pauls-saloon-lyrics"
  },
  {
    "artist": "Carl & Pearl Butler",
    "title": "The One You Slip Around With",
    "url": "https://genius.com/Carl-and-pearl-butler-the-one-you-slip-around-with-lyrics"
  },
  {
    "artist": "Carman",
    "title": "Just Like My Jesus",
    "url": "https://genius.com/Carman-just-like-my-jesus-lyrics"
  },
  {
    "artist": "Carman",
    "title": "We Have Come To Worship Him",
    "url": "https://genius.com/Carman-we-have-come-to-worship-him-lyrics"
  },
  {
    "artist": "Chrisnxtdoor",
    "title": "Give Me All Of You",
    "url": "https://genius.com/Chrisnxtdoor-give-me-all-of-you-lyrics"
  },
  {
    "artist": "Citizen Papes",
    "title": "Powerful",
    "url": "https://genius.com/Citizen-papes-powerful-lyrics"
  },
  {
    "artist": "Confetti",
    "title": "Gold Star Kid",
    "url": "https://genius.com/Confetti-gold-star-kid-lyrics"
  },
  {
    "artist": "Cowboy Copas",
    "title": "Don\u2019t Let The Deal Go Down",
    "url": "https://genius.com/Cowboy-copas-dont-let-the-deal-go-down-lyrics"
  },
  {
    "artist": "Cowboy Copas",
    "title": "Why Should I Want Her",
    "url": "https://genius.com/Cowboy-copas-why-should-i-want-her-lyrics"
  },
  {
    "artist": "Cowboy Copas",
    "title": "I\u2019ve Grown So Used To You",
    "url": "https://genius.com/Cowboy-copas-ive-grown-so-used-to-you-lyrics"
  },
  {
    "artist": "Cowboy Copas",
    "title": "I\u2019m Drifting Back To Dreamland",
    "url": "https://genius.com/Cowboy-copas-im-drifting-back-to-dreamland-lyrics"
  },
  {
    "artist": "Cowboy Copas",
    "title": "Carbon Copy",
    "url": "https://genius.com/Cowboy-copas-carbon-copy-lyrics"
  },
  {
    "artist": "Cowboy Copas",
    "title": "I\u2019m Glad For Your Sake",
    "url": "https://genius.com/Cowboy-copas-im-glad-for-your-sake-lyrics"
  },
  {
    "artist": "Cowboy Copas",
    "title": "When I Lost You",
    "url": "https://genius.com/Cowboy-copas-when-i-lost-you-lyrics"
  },
  {
    "artist": "Crystal Gayle",
    "title": "The Last Ray of Sunshine",
    "url": "https://genius.com/Crystal-gayle-the-last-ray-of-sunshine-lyrics"
  },
  {
    "artist": "DY Stone Code, Big Fearless & RayboiDC",
    "title": "Merlin",
    "url": "https://genius.com/Dy-stone-code-big-fearless-and-rayboidc-merlin-lyrics"
  },
  {
    "artist": "Damo K & Famous Pluto",
    "title": "Lifestyle",
    "url": "https://genius.com/Damo-k-and-famous-pluto-lifestyle-lyrics"
  },
  {
    "artist": "Dan Seals",
    "title": "While I\u2019m Here",
    "url": "https://genius.com/Dan-seals-while-im-here-lyrics"
  },
  {
    "artist": "Datboi Smee",
    "title": "Sexy Received",
    "url": "https://genius.com/Datboi-smee-sexy-received-lyrics"
  },
  {
    "artist": "Datboi Smee",
    "title": "Parker Na Parker",
    "url": "https://genius.com/Datboi-smee-parker-na-parker-lyrics"
  },
  {
    "artist": "Datboi Smee",
    "title": "Match Am",
    "url": "https://genius.com/Datboi-smee-match-am-lyrics"
  },
  {
    "artist": "Death by Denim",
    "title": "Payback",
    "url": "https://genius.com/Death-by-denim-payback-lyrics"
  },
  {
    "artist": "Devendra Banhart & Las Cachapas Peludas",
    "title": "Ni\u00f1a de Pelo Largo Nadando (Live in Big Sur)",
    "url": "https://genius.com/Devendra-banhart-and-las-cachapas-peludas-nina-de-pelo-largo-nadando-live-in-big-sur-lyrics"
  },
  {
    "artist": "EDDISON",
    "title": "wrist worth sex",
    "url": "https://genius.com/Eddison-wrist-worth-sex-lyrics"
  },
  {
    "artist": "El Tonio (NGA), Mama Original & Ab stah",
    "title": "Donate Am To Church",
    "url": "https://genius.com/El-tonio-nga-mama-original-and-ab-stah-donate-am-to-church-lyrics"
  },
  {
    "artist": "Emma Gabriel",
    "title": "Sunrise",
    "url": "https://genius.com/Emma-gabriel-sunrise-lyrics"
  },
  {
    "artist": "Emma Goldman (Band)",
    "title": "an introduction to real estate-induced psychosis",
    "url": "https://genius.com/Emma-goldman-band-an-introduction-to-real-estate-induced-psychosis-lyrics"
  },
  {
    "artist": "Falz",
    "title": "Round of Applause",
    "url": "https://genius.com/Falz-round-of-applause-lyrics"
  },
  {
    "artist": "Falz",
    "title": "Bounce",
    "url": "https://genius.com/Falz-bounce-lyrics"
  },
  {
    "artist": "Feathers (Rock)",
    "title": "Angel In the Sky",
    "url": "https://genius.com/Feathers-rock-angel-in-the-sky-lyrics"
  },
  {
    "artist": "FirstKlaz",
    "title": "Soyaiya",
    "url": "https://genius.com/Firstklaz-soyaiya-lyrics"
  },
  {
    "artist": "GENTLE NAIRA, IGB, Bluenax & Smokeboi",
    "title": "Evil Jingle II",
    "url": "https://genius.com/Gentle-naira-igb-bluenax-and-smokeboi-evil-jingle-ii-lyrics"
  },
  {
    "artist": "George Riley",
    "title": "Rain",
    "url": "https://genius.com/George-riley-rain-lyrics"
  },
  {
    "artist": "Glasxs",
    "title": "This Is the End / Baluchi\u2019s Song",
    "url": "https://genius.com/Glasxs-this-is-the-end-baluchis-song-lyrics"
  },
  {
    "artist": "Godfrey Gad",
    "title": "No Gree For Anybody!",
    "url": "https://genius.com/Godfrey-gad-no-gree-for-anybody-lyrics"
  },
  {
    "artist": "Heem B$F",
    "title": "1993",
    "url": "https://genius.com/Heem-b-f-1993-lyrics"
  },
  {
    "artist": "Heem B$F",
    "title": "Bars & Noble 2",
    "url": "https://genius.com/Heem-b-f-bars-and-noble-2-lyrics"
  },
  {
    "artist": "Iam Tongi, Tyler Cain & Johnny Reid",
    "title": "Sunshine",
    "url": "https://genius.com/Iam-tongi-william-tongi-tyler-cain-and-johnny-reid-sunshine-lyrics"
  },
  {
    "artist": "Infinity Knives & Brian Ennals",
    "title": "Soft Pack Shorty",
    "url": "https://genius.com/Infinity-knives-and-brian-ennals-soft-pack-shorty-lyrics"
  },
  {
    "artist": "Jack White",
    "title": "There\u2019s Nobody There",
    "url": "https://genius.com/Jack-white-theres-nobody-there-lyrics"
  },
  {
    "artist": "Jack White",
    "title": "Raising the Grain",
    "url": "https://genius.com/Jack-white-raising-the-grain-lyrics"
  },
  {
    "artist": "Jack White",
    "title": "You\u2019ll Never Fix Me",
    "url": "https://genius.com/Jack-white-youll-never-fix-me-lyrics"
  },
  {
    "artist": "Jack White",
    "title": "Nobody Knows",
    "url": "https://genius.com/Jack-white-nobody-knows-lyrics"
  },
  {
    "artist": "Jack White",
    "title": "I Can\u2019t Believe What I\u2019m Hearing",
    "url": "https://genius.com/Jack-white-i-cant-believe-what-im-hearing-lyrics"
  },
  {
    "artist": "Jack White",
    "title": "Thick as Thieves",
    "url": "https://genius.com/Jack-white-thick-as-thieves-lyrics"
  },
  {
    "artist": "Jack White",
    "title": "All Alone Again",
    "url": "https://genius.com/Jack-white-all-alone-again-lyrics"
  },
  {
    "artist": "Jack White",
    "title": "Making Contact",
    "url": "https://genius.com/Jack-white-making-contact-lyrics"
  },
  {
    "artist": "Jack White",
    "title": "Neighbors Blues",
    "url": "https://genius.com/Jack-white-neighbors-blues-lyrics"
  },
  {
    "artist": "Jack White",
    "title": "She\u2019s in a Frenzy",
    "url": "https://genius.com/Jack-white-shes-in-a-frenzy-lyrics"
  },
  {
    "artist": "James Blundell",
    "title": "Patience Wins",
    "url": "https://genius.com/James-blundell-patience-wins-lyrics"
  },
  {
    "artist": "James Blundell",
    "title": "How To Lift A Curse",
    "url": "https://genius.com/James-blundell-how-to-lift-a-curse-lyrics"
  },
  {
    "artist": "James Blundell",
    "title": "Red Devil Wind",
    "url": "https://genius.com/James-blundell-red-devil-wind-lyrics"
  },
  {
    "artist": "James Blundell",
    "title": "Whiskey Tree",
    "url": "https://genius.com/James-blundell-whiskey-tree-lyrics"
  },
  {
    "artist": "James Blundell",
    "title": "Morrison\u2019s Dog",
    "url": "https://genius.com/James-blundell-morrisons-dog-lyrics"
  },
  {
    "artist": "James Blundell",
    "title": "Queen of The Lost Highway",
    "url": "https://genius.com/James-blundell-queen-of-the-lost-highway-lyrics"
  },
  {
    "artist": "James Blundell",
    "title": "The World Don\u2019t Stop",
    "url": "https://genius.com/James-blundell-the-world-dont-stop-lyrics"
  },
  {
    "artist": "James Blundell & Lilly Brown",
    "title": "One Of Those Saturday Nights",
    "url": "https://genius.com/James-blundell-and-lilly-brown-one-of-those-saturday-nights-lyrics"
  },
  {
    "artist": "James Emmanuel",
    "title": "Obsessed",
    "url": "https://genius.com/James-emmanuel-obsessed-lyrics"
  },
  {
    "artist": "Jeremy Spencer",
    "title": "Here Comes Charlie (With His Dancing Shoes On)",
    "url": "https://genius.com/Jeremy-spencer-here-comes-charlie-with-his-dancing-shoes-on-lyrics"
  },
  {
    "artist": "Jeremy Spencer",
    "title": "Take A Look Around Mrs. Brown",
    "url": "https://genius.com/Jeremy-spencer-take-a-look-around-mrs-brown-lyrics"
  },
  {
    "artist": "Jon B.",
    "title": "Ain\u2019t Nothing",
    "url": "https://genius.com/Jon-b-aint-nothing-lyrics"
  },
  {
    "artist": "Jon B.",
    "title": "All For You",
    "url": "https://genius.com/Jon-b-all-for-you-lyrics"
  },
  {
    "artist": "Jordan Knight",
    "title": "Your Man",
    "url": "https://genius.com/Jordan-knight-your-man-lyrics"
  },
  {
    "artist": "Jordan Knight",
    "title": "Don\u2019t Cry",
    "url": "https://genius.com/Jordan-knight-dont-cry-lyrics"
  },
  {
    "artist": "Jordan Knight",
    "title": "Where Is Your Heart Tonight (Acoustic)",
    "url": "https://genius.com/Jordan-knight-where-is-your-heart-tonight-acoustic-lyrics"
  },
  {
    "artist": "Josh b4l & Smur Lee",
    "title": "Chop Am",
    "url": "https://genius.com/Josh-b4l-and-smur-lee-chop-am-lyrics"
  },
  {
    "artist": "Kapote & Harvey Sutherland",
    "title": "Mystery (Harvey Sutherland Remix)",
    "url": "https://genius.com/Kapote-and-harvey-sutherland-mystery-harvey-sutherland-remix-lyrics"
  },
  {
    "artist": "Kay-1",
    "title": "Juicy",
    "url": "https://genius.com/Kay-1-juicy-lyrics"
  },
  {
    "artist": "Kenny Barron & Ann Hampton Callaway",
    "title": "Cook\u2019s Bay",
    "url": "https://genius.com/Kenny-barron-and-ann-hampton-callaway-cooks-bay-lyrics"
  },
  {
    "artist": "Kenny Barron & Catherine Russell",
    "title": "Minor Blues Redux",
    "url": "https://genius.com/Kenny-barron-and-catherine-russell-minor-blues-redux-lyrics"
  },
  {
    "artist": "Kenny Barron & Ekep Nkwelle",
    "title": "Sonia Braga",
    "url": "https://genius.com/Kenny-barron-and-ekep-nkwelle-sonia-braga-lyrics"
  },
  {
    "artist": "Kenny Barron & Ekep Nkwelle",
    "title": "Illusion",
    "url": "https://genius.com/Kenny-barron-and-ekep-nkwelle-illusion-lyrics"
  },
  {
    "artist": "Kenny Barron & Jean Norris-Baylor",
    "title": "Until Then",
    "url": "https://genius.com/Kenny-barron-and-jean-norris-baylor-until-then-lyrics"
  },
  {
    "artist": "Kenny Barron & Jean Norris-Baylor",
    "title": "Beyond This Place",
    "url": "https://genius.com/Kenny-barron-and-jean-norris-baylor-beyond-this-place-lyrics"
  },
  {
    "artist": "Kenny Barron & Kavita Shah",
    "title": "Lullabye",
    "url": "https://genius.com/Kenny-barron-and-kavita-shah-lullabye-lyrics"
  },
  {
    "artist": "Kenny Barron & Tyreek McDole",
    "title": "Marie Laveau",
    "url": "https://genius.com/Kenny-barron-and-tyreek-mcdole-marie-laveau-lyrics"
  },
  {
    "artist": "Kenny Barron & Tyreek McDole",
    "title": "Calypso",
    "url": "https://genius.com/Kenny-barron-and-tyreek-mcdole-calypso-lyrics"
  },
  {
    "artist": "Khantrast",
    "title": "ADD - Remix",
    "url": "https://genius.com/Khantrast-add-remix-lyrics"
  },
  {
    "artist": "Kharii (USA)",
    "title": "IDIOTIC",
    "url": "https://genius.com/Kharii-usa-idiotic-lyrics"
  },
  {
    "artist": "Kill Bill: The Rapper",
    "title": "THE BUILDING WITH THE BLUE BUTTERFLY",
    "url": "https://genius.com/Kill-bill-the-rapper-the-building-with-the-blue-butterfly-lyrics"
  },
  {
    "artist": "Len (CAN)",
    "title": "Threethirteen",
    "url": "https://genius.com/Len-can-threethirteen-lyrics"
  },
  {
    "artist": "Logik Tha Pro",
    "title": "Tukay (2k)",
    "url": "https://genius.com/Logik-tha-pro-tukay-2k-lyrics"
  },
  {
    "artist": "Logik Tha Pro",
    "title": "Legxus",
    "url": "https://genius.com/Logik-tha-pro-legxus-lyrics"
  },
  {
    "artist": "Logik Tha Pro",
    "title": "Make I Bend",
    "url": "https://genius.com/Logik-tha-pro-make-i-bend-lyrics"
  },
  {
    "artist": "Logik Tha Pro",
    "title": "Sapa Lemme",
    "url": "https://genius.com/Logik-tha-pro-sapa-lemme-lyrics"
  },
  {
    "artist": "Logik Tha Pro",
    "title": "Balanced Die-Yet",
    "url": "https://genius.com/Logik-tha-pro-balanced-die-yet-lyrics"
  },
  {
    "artist": "Logik Tha Pro",
    "title": "Make Me Trek",
    "url": "https://genius.com/Logik-tha-pro-make-me-trek-lyrics"
  },
  {
    "artist": "Logik Tha Pro",
    "title": "Villain",
    "url": "https://genius.com/Logik-tha-pro-villain-lyrics"
  },
  {
    "artist": "Logik Tha Pro & LAMB CULTURE.",
    "title": "E Chowque",
    "url": "https://genius.com/Logik-tha-pro-and-lamb-culture-e-chowque-lyrics"
  },
  {
    "artist": "Masterkraft",
    "title": "To You",
    "url": "https://genius.com/Masterkraft-to-you-lyrics"
  },
  {
    "artist": "Matt Gould",
    "title": "Insignificant",
    "url": "https://genius.com/Matt-gould-insignificant-lyrics"
  },
  {
    "artist": "Matt Gould",
    "title": "Two Sides",
    "url": "https://genius.com/Matt-gould-two-sides-lyrics"
  },
  {
    "artist": "Matt Gould",
    "title": "Moment of Insight",
    "url": "https://genius.com/Matt-gould-moment-of-insight-lyrics"
  },
  {
    "artist": "Matt Gould",
    "title": "Can\u2019t Let Go",
    "url": "https://genius.com/Matt-gould-cant-let-go-lyrics"
  },
  {
    "artist": "Matt Gould",
    "title": "Disappear",
    "url": "https://genius.com/Matt-gould-disappear-lyrics"
  },
  {
    "artist": "Matt Gould",
    "title": "Give In",
    "url": "https://genius.com/Matt-gould-give-in-lyrics"
  },
  {
    "artist": "Matt Gould",
    "title": "Rock in Rushing Water",
    "url": "https://genius.com/Matt-gould-rock-in-rushing-water-lyrics"
  },
  {
    "artist": "Matt Gould",
    "title": "I Compose Myself",
    "url": "https://genius.com/Matt-gould-i-compose-myself-lyrics"
  },
  {
    "artist": "Matt Gould",
    "title": "The Game",
    "url": "https://genius.com/Matt-gould-the-game-lyrics"
  },
  {
    "artist": "Matt Gould",
    "title": "Supernova",
    "url": "https://genius.com/Matt-gould-supernova-lyrics"
  },
  {
    "artist": "Mavo",
    "title": "JEHOVA*",
    "url": "https://genius.com/Mavo-jehova-lyrics"
  },
  {
    "artist": "Mavo",
    "title": "EFREBO*",
    "url": "https://genius.com/Mavo-efrebo-lyrics"
  },
  {
    "artist": "Mike Ryan",
    "title": "Say Goodbye",
    "url": "https://genius.com/Mike-ryan-say-goodbye-lyrics"
  },
  {
    "artist": "NITAH",
    "title": "Back Seat",
    "url": "https://genius.com/Nitah-back-seat-lyrics"
  },
  {
    "artist": "Nina Caroline",
    "title": "Outsider",
    "url": "https://genius.com/Nina-caroline-outsider-lyrics"
  },
  {
    "artist": "Nora Fatehi, Vegedream & Sanjoy",
    "title": "Siir Siir",
    "url": "https://genius.com/Nora-fatehi-vegedream-and-sanjoy-siir-siir-lyrics"
  },
  {
    "artist": "OKAY FINE",
    "title": "LET ME COOK",
    "url": "https://genius.com/Okay-fine-let-me-cook-lyrics"
  },
  {
    "artist": "Olamide, Larry Gaaga, Mavo & Kidd Carder",
    "title": "Come on",
    "url": "https://genius.com/Olamide-larry-gaaga-mavo-and-kidd-carder-come-on-lyrics"
  },
  {
    "artist": "Outside Edge",
    "title": "Not Guilty",
    "url": "https://genius.com/Outside-edge-not-guilty-lyrics"
  },
  {
    "artist": "Outside Edge",
    "title": "Cherie",
    "url": "https://genius.com/Outside-edge-cherie-lyrics"
  },
  {
    "artist": "Outside Edge",
    "title": "Avenue Of The Americas",
    "url": "https://genius.com/Outside-edge-avenue-of-the-americas-lyrics"
  },
  {
    "artist": "Outside Edge",
    "title": "Change",
    "url": "https://genius.com/Outside-edge-change-lyrics"
  },
  {
    "artist": "Outside Edge",
    "title": "Edge Of Madness",
    "url": "https://genius.com/Outside-edge-edge-of-madness-lyrics"
  },
  {
    "artist": "PRA (Nigeria)",
    "title": "Juju Pro",
    "url": "https://genius.com/Pra-nigeria-juju-pro-lyrics"
  },
  {
    "artist": "Partners-N-Crime",
    "title": "Thank You Miss Lilly",
    "url": "https://genius.com/Partners-n-crime-thank-you-miss-lilly-lyrics"
  },
  {
    "artist": "Patsy & Dave & James Blundell",
    "title": "After The Storm",
    "url": "https://genius.com/Patsy-and-dave-and-james-blundell-after-the-storm-lyrics"
  },
  {
    "artist": "Paul Anka",
    "title": "Dannon",
    "url": "https://genius.com/Paul-anka-dannon-lyrics"
  },
  {
    "artist": "Paul Anka",
    "title": "A Mexican Night",
    "url": "https://genius.com/Paul-anka-a-mexican-night-lyrics"
  },
  {
    "artist": "Paul Anka",
    "title": "If I Had My Life to Live Over",
    "url": "https://genius.com/Paul-anka-if-i-had-my-life-to-live-over-lyrics"
  },
  {
    "artist": "Paul Anka",
    "title": "Tonight",
    "url": "https://genius.com/Paul-anka-tonight-lyrics"
  },
  {
    "artist": "Peacestar",
    "title": "To the Light",
    "url": "https://genius.com/Peacestar-to-the-light-lyrics"
  },
  {
    "artist": "Peacestar & Meeky James",
    "title": "Groovy Love II",
    "url": "https://genius.com/Peacestar-and-meeky-james-groovy-love-ii-lyrics"
  },
  {
    "artist": "Peacestar, Logik Tha Pro & Diyo Matalo",
    "title": "Groovy Love",
    "url": "https://genius.com/Peacestar-logik-tha-pro-and-diyo-matalo-groovy-love-lyrics"
  },
  {
    "artist": "Rachel Harlow",
    "title": "Avalon",
    "url": "https://genius.com/Rachel-harlow-avalon-lyrics"
  },
  {
    "artist": "Ray Conniff Orchestra and Chorus",
    "title": "Medley: The First Noel/ Hark! The Herald Angels Sing/ O Come All Ye Faithful/ We Wish You A Merry Christmas",
    "url": "https://genius.com/Ray-conniff-orchestra-and-chorus-medley-the-first-noel-hark-the-herald-angels-sing-o-come-all-ye-faithful-we-wish-you-a-merry-christmas-lyrics"
  },
  {
    "artist": "Reflexsoundz",
    "title": "PDAPC",
    "url": "https://genius.com/Reflexsoundz-pdapc-lyrics"
  },
  {
    "artist": "Reflexsoundz",
    "title": "Obi (Romanized)",
    "url": "https://genius.com/Reflexsoundz-obi-romanized-lyrics"
  },
  {
    "artist": "Relic Rhymes & Lola Brooke",
    "title": "My Lord (Hair Done) 2",
    "url": "https://genius.com/Relic-rhymes-and-lola-brooke-my-lord-hair-done-2-lyrics"
  },
  {
    "artist": "Rord Kelly",
    "title": "Mebelum Ife",
    "url": "https://genius.com/Rord-kelly-mebelum-ife-lyrics"
  },
  {
    "artist": "Rord Kelly & Chella",
    "title": "Okwu (Remix)",
    "url": "https://genius.com/Rord-kelly-and-chella-okwu-remix-lyrics"
  },
  {
    "artist": "SSSoundGawd, Mavo & Joshua Baraka",
    "title": "Hey Mama",
    "url": "https://genius.com/Sssoundgawd-mavo-and-joshua-baraka-hey-mama-lyrics"
  },
  {
    "artist": "Saint Jude",
    "title": "Does",
    "url": "https://genius.com/Saint-jude-does-lyrics"
  },
  {
    "artist": "Saint Jude",
    "title": "Halfway",
    "url": "https://genius.com/Saint-jude-halfway-lyrics"
  },
  {
    "artist": "Saint Jude",
    "title": "Last Summer",
    "url": "https://genius.com/Saint-jude-last-summer-lyrics"
  },
  {
    "artist": "Sarz & WurlD",
    "title": "Nice n Slow",
    "url": "https://genius.com/Sarz-and-wurld-nice-n-slow-lyrics"
  },
  {
    "artist": "Shallipopi",
    "title": "Backup*",
    "url": "https://genius.com/Shallipopi-backup-lyrics"
  },
  {
    "artist": "Shoday, Billionboi & Olamide",
    "title": "Come Kulosa",
    "url": "https://genius.com/Shoday-billionboi-and-olamide-come-kulosa-lyrics"
  },
  {
    "artist": "Smur Lee, DJ Maphorisa, Focalistic, Ch'cco, Mluusician & BigBaller_CEO",
    "title": "Deliver",
    "url": "https://genius.com/Smur-lee-dj-maphorisa-focalistic-chcco-mluusician-and-bigballer-ceo-deliver-lyrics"
  },
  {
    "artist": "Smur Lee, Treepz & Stuph Chain",
    "title": "Hate On Me",
    "url": "https://genius.com/Smur-lee-treepz-and-stuph-chain-hate-on-me-lyrics"
  },
  {
    "artist": "So Plush",
    "title": "Phone Messages (Part 2)",
    "url": "https://genius.com/So-plush-phone-messages-part-2-lyrics"
  },
  {
    "artist": "So Plush",
    "title": "L.A. L.A.",
    "url": "https://genius.com/So-plush-la-la-lyrics"
  },
  {
    "artist": "Sodikken (AI)",
    "title": "Counting Hours",
    "url": "https://genius.com/Sodikken-ai-counting-hours-lyrics"
  },
  {
    "artist": "Steevi Jaimz",
    "title": "Kick That Habit",
    "url": "https://genius.com/Steevi-jaimz-kick-that-habit-lyrics"
  },
  {
    "artist": "Stepz (UK)",
    "title": "Book Bag",
    "url": "https://genius.com/Stepz-uk-book-bag-lyrics"
  },
  {
    "artist": "Stepz (UK)",
    "title": "Superhero",
    "url": "https://genius.com/Stepz-uk-superhero-lyrics"
  },
  {
    "artist": "Studiowyzz",
    "title": "Boy Gotta Do",
    "url": "https://genius.com/Studiowyzz-boy-gotta-do-lyrics"
  },
  {
    "artist": "Studiowyzz",
    "title": "Bro",
    "url": "https://genius.com/Studiowyzz-bro-lyrics"
  },
  {
    "artist": "Studiowyzz & Jada O\u2019Neill",
    "title": "High Some Days",
    "url": "https://genius.com/Studiowyzz-and-jada-oneill-high-some-days-lyrics"
  },
  {
    "artist": "TKandz & CXSPER",
    "title": "PHOTOGENIC",
    "url": "https://genius.com/Tkandz-and-cxsper-photogenic-lyrics"
  },
  {
    "artist": "Terry Apala & Mavo",
    "title": "Apaladisskizzy",
    "url": "https://genius.com/Terry-apala-and-mavo-apaladisskizzy-lyrics"
  },
  {
    "artist": "The 5th Dimension",
    "title": "A Good Love",
    "url": "https://genius.com/The-5th-dimension-a-good-love-lyrics"
  },
  {
    "artist": "The Black Crowes",
    "title": "Girl From The Panwshop",
    "url": "https://genius.com/The-black-crowes-girl-from-the-panwshop-lyrics"
  },
  {
    "artist": "The Black Crowes",
    "title": "Nonfiction (Acoustic)",
    "url": "https://genius.com/The-black-crowes-nonfiction-acoustic-lyrics"
  },
  {
    "artist": "The Black Crowes",
    "title": "P.25 London (Live At AIR Studios, October 25, 1994)",
    "url": "https://genius.com/The-black-crowes-p25-london-live-at-air-studios-october-25-1994-lyrics"
  },
  {
    "artist": "The Black Crowes",
    "title": "Wiser Time (Live At AIR Studios, October 25, 1994)",
    "url": "https://genius.com/The-black-crowes-wiser-time-live-at-air-studios-october-25-1994-lyrics"
  },
  {
    "artist": "The Black Crowes",
    "title": "High Head Times (Live At AIR Studios, October 25, 1994)",
    "url": "https://genius.com/The-black-crowes-high-head-times-live-at-air-studios-october-25-1994-lyrics"
  },
  {
    "artist": "The Cool Kids",
    "title": "Taking a Break (Interlude)",
    "url": "https://genius.com/The-cool-kids-taking-a-break-interlude-lyrics"
  },
  {
    "artist": "The Cool Kids",
    "title": "Weekend Girls",
    "url": "https://genius.com/The-cool-kids-weekend-girls-lyrics"
  },
  {
    "artist": "Thibault Cauvin & -M- (FRA)",
    "title": "\u00a1 Pura Vida Fenomenal ! (Live Le Nouveau Si\u00e8cle 2024)",
    "url": "https://genius.com/Thibault-cauvin-and-m-fra-pura-vida-fenomenal-live-le-nouveau-siecle-2024-lyrics"
  },
  {
    "artist": "Tomi Lumiere",
    "title": "Feeling Good",
    "url": "https://genius.com/Tomi-lumiere-feeling-good-lyrics"
  },
  {
    "artist": "Trent Willmon",
    "title": "There Is God",
    "url": "https://genius.com/Trent-willmon-there-is-god-lyrics"
  },
  {
    "artist": "Troy Venus & Monochrome",
    "title": "Pop Something",
    "url": "https://genius.com/Troy-venus-and-monochrome-pop-something-lyrics"
  },
  {
    "artist": "Victony",
    "title": "Like it*",
    "url": "https://genius.com/Victony-like-it-lyrics"
  },
  {
    "artist": "Victony",
    "title": "Orijo*",
    "url": "https://genius.com/Victony-orijo-lyrics"
  },
  {
    "artist": "Villager",
    "title": "IN LOVE WITH YOU FOR THE LAST TIME",
    "url": "https://genius.com/Villager-in-love-with-you-for-the-last-time-lyrics"
  },
  {
    "artist": "Villager",
    "title": "OXYGEN",
    "url": "https://genius.com/Villager-oxygen-lyrics"
  },
  {
    "artist": "Villager",
    "title": "LORETTA, I TRIED!",
    "url": "https://genius.com/Villager-loretta-i-tried-lyrics"
  },
  {
    "artist": "Villager",
    "title": "SIX SHOTS",
    "url": "https://genius.com/Villager-six-shots-lyrics"
  },
  {
    "artist": "Villager",
    "title": "HOLD OF ME",
    "url": "https://genius.com/Villager-hold-of-me-lyrics"
  },
  {
    "artist": "Villager",
    "title": "NEEDLE IN THE SKIN",
    "url": "https://genius.com/Villager-needle-in-the-skin-lyrics"
  },
  {
    "artist": "Villager",
    "title": "INERTIA",
    "url": "https://genius.com/Villager-inertia-lyrics"
  },
  {
    "artist": "WAVE$TAR",
    "title": "Government Money/My5*",
    "url": "https://genius.com/Wave-tar-government-money-my5-lyrics"
  },
  {
    "artist": "WYSHLESS",
    "title": "ALL U KNOW",
    "url": "https://genius.com/Wyshless-all-u-know-lyrics"
  },
  {
    "artist": "Waysted",
    "title": "Hurts So Bad",
    "url": "https://genius.com/Waysted-hurts-so-bad-lyrics"
  },
  {
    "artist": "Wealthy Micky & NO11",
    "title": "HOW FAR - COVER",
    "url": "https://genius.com/Wealthy-micky-and-no11-how-far-cover-lyrics"
  },
  {
    "artist": "XVGRAM",
    "title": "MY SOUL",
    "url": "https://genius.com/Xvgram-my-soul-lyrics"
  },
  {
    "artist": "Yo Gabba Gabba & James Husband",
    "title": "To Give A Present",
    "url": "https://genius.com/Yo-gabba-gabba-and-james-husband-to-give-a-present-lyrics"
  },
  {
    "artist": "Yo Gabba Gabba & Mark Mothersbaugh",
    "title": "Make It Yourself",
    "url": "https://genius.com/Yo-gabba-gabba-and-mark-mothersbaugh-make-it-yourself-lyrics"
  },
  {
    "artist": "Yungeen Ace",
    "title": "Answer Da Phone",
    "url": "https://genius.com/Yungeen-ace-answer-da-phone-lyrics"
  },
  {
    "artist": "Yungeen Ace",
    "title": "Ain\u2019t Good Enough",
    "url": "https://genius.com/Yungeen-ace-aint-good-enough-lyrics"
  },
  {
    "artist": "Yungeen Ace",
    "title": "Waste My Time",
    "url": "https://genius.com/Yungeen-ace-waste-my-time-lyrics"
  },
  {
    "artist": "Yungeen Ace",
    "title": "In the Shadow",
    "url": "https://genius.com/Yungeen-ace-in-the-shadow-lyrics"
  },
  {
    "artist": "Zach Diamond",
    "title": "Angels And Demons",
    "url": "https://genius.com/Zach-diamond-angels-and-demons-lyrics"
  },
  {
    "artist": "Zach Diamond",
    "title": "Around Me",
    "url": "https://genius.com/Zach-diamond-around-me-lyrics"
  },
  {
    "artist": "Zerrydl",
    "title": "Bounce It",
    "url": "https://genius.com/Zerrydl-bounce-it-lyrics"
  },
  {
    "artist": "Zerrydl",
    "title": "My Amigo",
    "url": "https://genius.com/Zerrydl-my-amigo-lyrics"
  },
  {
    "artist": "Zerrydl, Jenerall & Tega boi dc",
    "title": "Stack",
    "url": "https://genius.com/Zerrydl-jenerall-and-tega-boi-dc-stack-lyrics"
  },
  {
    "artist": "Zerrydl, Jenerall & Tega boi dc",
    "title": "Igho",
    "url": "https://genius.com/Zerrydl-jenerall-and-tega-boi-dc-igho-lyrics"
  },
  {
    "artist": "Zlatan",
    "title": "Jeserawa",
    "url": "https://genius.com/Zlatan-jeserawa-lyrics"
  },
  {
    "artist": "darken (ESP)",
    "title": "MrBeast Give Me Some Money",
    "url": "https://genius.com/Darken-esp-mrbeast-give-me-some-money-lyrics"
  },
  {
    "artist": "ePianoh",
    "title": "Tinubu",
    "url": "https://genius.com/Epianoh-tinubu-lyrics"
  },
  {
    "artist": "ePianoh",
    "title": "Send 2k",
    "url": "https://genius.com/Epianoh-send-2k-lyrics"
  },
  {
    "artist": "homepage",
    "title": "brand new me!",
    "url": "https://genius.com/Homepage-brand-new-me-lyrics"
  },
  {
    "artist": "sabrina (CMR)",
    "title": "Alone",
    "url": "https://genius.com/Sabrina-cmr-alone-lyrics"
  },
  {
    "artist": "zekke",
    "title": "AFK",
    "url": "https://genius.com/Zekke-afk-lyrics"
  }
];

let isBulkRunning = false;
let isBulkPaused = false;

function initBulkAwardIq() {
    const loadDefaultListBtn = document.getElementById('loadDefaultListBtn');
    const clearBulkIqBtn = document.getElementById('clearBulkIqBtn');
    const bulkIqUrlsInput = document.getElementById('bulkIqUrlsInput');
    const startBulkIqBtn = document.getElementById('startBulkIqBtn');
    const pauseBulkIqBtn = document.getElementById('pauseBulkIqBtn');

    const bulkStatTotal = document.getElementById('bulkStatTotal');
    const bulkStatAwarded = document.getElementById('bulkStatAwarded');
    const bulkStatSkipped = document.getElementById('bulkStatSkipped');
    const bulkStatFailed = document.getElementById('bulkStatFailed');
    const bulkIqLog = document.getElementById('bulkIqLog');

    if (!startBulkIqBtn) return;

    function logBulk(msg, color = '#eee') {
        const time = new Date().toLocaleTimeString();
        const div = document.createElement('div');
        div.style.color = color;
        div.style.marginBottom = '2px';
        div.textContent = `[${time}] ${msg}`;
        bulkIqLog.appendChild(div);
        bulkIqLog.scrollTop = bulkIqLog.scrollHeight;
    }

    loadDefaultListBtn.addEventListener('click', () => {
        bulkIqUrlsInput.value = JSON.stringify(PROVIDED_SONGS_LIST, null, 2);
        logBulk(`Loaded provided list of ${PROVIDED_SONGS_LIST.length} songs into textarea.`, '#ffff64');
    });

    clearBulkIqBtn.addEventListener('click', () => {
        bulkIqUrlsInput.value = '';
        bulkIqLog.innerHTML = '<div>[Ready] Awaiting song list...</div>';
        bulkStatTotal.textContent = '0';
        bulkStatAwarded.textContent = '0';
        bulkStatSkipped.textContent = '0';
        bulkStatFailed.textContent = '0';
    });

    pauseBulkIqBtn.addEventListener('click', () => {
        isBulkPaused = !isBulkPaused;
        pauseBulkIqBtn.textContent = isBulkPaused ? 'Resume' : 'Pause';
        logBulk(isBulkPaused ? 'Processing paused.' : 'Resuming processing...', '#ffff64');
    });

    startBulkIqBtn.addEventListener('click', async () => {
        if (isBulkRunning) return;

        const rawText = bulkIqUrlsInput.value.trim();
        if (!rawText) {
            logBulk('Error: No Genius song URLs or JSON provided.', '#fa7878');
            return;
        }

        let items = [];
        try {
            if (rawText.startsWith('[') || rawText.startsWith('{')) {
                const parsed = JSON.parse(rawText);
                items = Array.isArray(parsed) ? parsed : [parsed];
            } else {
                items = rawText.split('\n').map(l => ({ url: l.trim() })).filter(o => o.url.length > 0);
            }
        } catch (e) {
            items = rawText.split('\n').map(l => ({ url: l.trim() })).filter(o => o.url.length > 0);
        }

        items = items.filter(item => item && (item.url || item.id || item.song_id));

        if (items.length === 0) {
            logBulk('Error: Could not parse any valid Genius song entries.', '#fa7878');
            return;
        }

        isBulkRunning = true;
        isBulkPaused = false;
        startBulkIqBtn.disabled = true;
        pauseBulkIqBtn.disabled = false;
        pauseBulkIqBtn.textContent = 'Pause';

        let total = items.length;
        let awarded = 0;
        let skipped = 0;
        let failed = 0;

        bulkStatTotal.textContent = total;
        bulkStatAwarded.textContent = awarded;
        bulkStatSkipped.textContent = skipped;
        bulkStatFailed.textContent = failed;

        logBulk(`Starting batch execution for ${total} songs...`, '#99f2a5');

        for (let i = 0; i < items.length; i++) {
            if (!isBulkRunning) break;

            while (isBulkPaused) {
                await new Promise(r => setTimeout(r, 500));
            }

            const entry = items[i];
            const url = entry.url || '';
            const artist = entry.artist || '';
            const title = entry.title || '';
            const label = (artist && title) ? `${artist} - "${title}"` : (url || `Song #${entry.id || entry.song_id}`);

            logBulk(`[${i + 1}/${total}] Checking: ${label}...`, '#aaa');

            try {
                let songId = entry.id || entry.song_id || null;

                if (!songId && url) {
                    const pageRes = await fetch(url, { credentials: 'include' });
                    if (!pageRes.ok) throw new Error(`HTTP ${pageRes.status} fetching song page`);
                    const html = await pageRes.text();

                    const match = html.match(/genius:\/\/songs\/(\d+)/) ||
                                  html.match(/"song":\s*\{\s*"id":\s*(\d+)/) ||
                                  html.match(/"Song ID",\s*"value":\s*(\d+)/) ||
                                  html.match(/songs\/(\d+)\/embed/);
                    if (match) songId = match[1];
                }

                if (!songId) {
                    throw new Error('Could not resolve Song ID');
                }

                const songData = await getApiData(songId, 'songs');
                const song = songData.song || songData;

                const isAlreadyComplete = song.lyrics_state === 'complete' ||
                                          song.transcription_iq_awarded === true ||
                                          song.lyrics_marked_complete_by != null;

                if (isAlreadyComplete) {
                    skipped++;
                    bulkStatSkipped.textContent = skipped;
                    logBulk(`[SKIPPED] ${label} (Song #${songId}): Already marked complete / IQ awarded.`, '#ffff64');
                } else {
                    const canAward = song.current_user_metadata?.permissions?.includes('award_transcription_iq') ?? true;
                    if (!canAward) {
                        failed++;
                        bulkStatFailed.textContent = failed;
                        logBulk(`[INELIGIBLE] ${label} (Song #${songId}): Option not available or missing permission.`, '#fa7878');
                    } else {
                        const awardRes = await awardTranscriptionIq(songId);
                        if (awardRes && awardRes.ok) {
                            awarded++;
                            bulkStatAwarded.textContent = awarded;
                            logBulk(`[AWARDED] ${label} (Song #${songId}): Successfully awarded transcription IQ!`, '#99f2a5');
                        } else {
                            failed++;
                            bulkStatFailed.textContent = failed;
                            logBulk(`[FAILED] ${label} (Song #${songId}): ${awardRes?.statusText || awardRes?.error || 'Request failed'}`, '#fa7878');
                        }
                    }
                }
            } catch (err) {
                failed++;
                bulkStatFailed.textContent = failed;
                logBulk(`[ERROR] ${label}: ${err.message}`, '#fa7878');
            }

            await new Promise(r => setTimeout(r, 600));
        }

        logBulk(`Batch execution completed! Total: ${total}, Awarded: ${awarded}, Skipped: ${skipped}, Failed: ${failed}`, '#ffff64');
        isBulkRunning = false;
        startBulkIqBtn.disabled = false;
        pauseBulkIqBtn.disabled = true;
    });
}

initBulkAwardIq();
