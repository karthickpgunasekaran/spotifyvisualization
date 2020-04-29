var musicKeyNames = ["missing","C","C#/Db","D","D#/Eb","E",
                    "F","F#/Gb","G","G#/Ab","A","A#/Bb","B"];

var fieldNames = [
    "track_id", "track_name", "track_artist", "track_popularity",
    "track_album_id", "track_album_name", "track_album_release_date",
    "playlist_name", "playlist_id", "playlist_genre", "playlist_subgenre",
    "danceability", "energy", "key", "loudness", "mode", "speechiness",
    "acousticness", "instrumentalness", "liveness", "valence",
    "tempo", "duration_ms"
];

function hasContinuousValues(key){
    let valuesAreContinuous = {
        track_id:           false,
        track_name:         false,
        track_artist:       false,
        track_popularity:   true,
        track_album_id:     false,
        track_album_name:   false,
        track_album_release_date:  true,
        playlist_name:      false,
        playlist_id:        false,
        playlist_genre:     false,
        playlist_subgenre:  false,
        danceability:       true,
        energy:             true,
        key:                false,
        loudness:           true,
        mode:               false,
        speechiness:        true,
        acousticness:       true,
        instrumentalness:   true,
        liveness:           true,
        valence:            true,
        tempo:              true,
        duration_ms:        true
    }
    return valuesAreContinuous[key];
}

function getReadableName(key){
    let valueName = {
        track_id:           "Track ID",
        track_name:         "Track Name",
        track_artist:       "Artist",
        track_popularity:   "Popularity",
        track_album_id:     "Album ID",
        track_album_name:   "Album Name",
        track_album_release_date:  "Release Date",
        playlist_name:      "Playlist Name",
        playlist_id:        "Playlist ID",
        playlist_genre:     "Playlist Genre",
        playlist_subgenre:  "Playlist Subgenre",
        danceability:       "Danceability",
        energy:             "Energy",
        key:                "Key",
        loudness:           "Loudness",
        mode:               "Mode",
        speechiness:        "Speechiness",
        acousticness:       "Acousticness",
        instrumentalness:   "Instrumentalness",
        liveness:           "Liveness",
        valence:            "Valence",
        tempo:              "Tempo",
        duration_ms:        "Duration(ms)"
    }
    return valueName[key];
}

function musicKeyToString(k){
    /*
    All values in the array are shifted up because 
    the scale starts at -1 for "missing", not 0.
    */
    return musicKeyNames[k+1]; 
}

function musicModeToString(m){
    if(m>0) return "minor";
    return "major";
}

function csv_preprocessing_function(d){
    return {
        track_id:           d.track_id,
        track_name:         d.track_name,
        track_artist:       d.track_artist,
        track_popularity:  +d.track_popularity,
        track_album_id:     d.track_album_id,
        track_album_name:   d.track_album_name,
        track_album_release_date: new Date(d.track_album_release_date),
        playlist_name:      d.playlist_name,
        playlist_id:        d.playlist_id,
        playlist_genre:     d.playlist_genre,
        playlist_subgenre:  d.playlist_subgenre,
        danceability:      +d.danceability,
        energy:            +d.energy,
        key:                musicKeyToString(+d.key),
        loudness:          +d.loudness,
        mode:               musicModeToString(+d.mode),
        speechiness:       +d.speechiness,
        acousticness:      +d.acousticness,
        instrumentalness:  +d.instrumentalness,
        liveness:          +d.liveness,
        valence:           +d.valence,
        tempo:             +d.tempo,
        duration_ms:       +d.duration_ms
    };
}