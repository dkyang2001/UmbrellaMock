import React, { useState, useRef, useEffect } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import styles from "./App.module.css";
import umbrellas from "./umbrellaHistory.json";

import { createUmbrellaElement, createDotElement } from "./animationHelper.js";
import cx from "classnames";

function App() {
  /*********************   State/Ref Declaration *********************************/
  //viewport state
  const [viewport, setViewport] = useState({
    lat: 40.7128,
    long: -74.006,
    zoom: 12,
  });
  const [mode, setMode] = useState(1);

  const [markers, setMarkers] = useState([]);
  /****************************************************************************/
  //app refs
  const mapContainer = useRef(null);
  const map = useRef(null);

  //the umbrella id
  const umID = "14339";
  /*****************************************************************************/
  /********************** Map Initiator ****************************************/
  //create map on first render
  useEffect(() => {
    if (map.current) return;

    //declare map
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      center: [viewport.long, viewport.lat],
      zoom: viewport.zoom,
      /*  maxBounds: [
        [-79.30649038019007, 37.07593093665458],
        [-77.77970744982255, 38.507663235091985],
      ],*/
      style: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
      attributionControl: false,
    }).addControl(
      new maplibregl.AttributionControl({
        compact: true,
        collapsed: true,
      }),
      "bottom-left"
    );

    //disable 3d tilt
    map.current.touchPitch.disable();

    //viewport set on move
    map.current.on("move", () => {
      const newLong = map.current.getCenter().lng.toFixed(4);
      const newLat = map.current.getCenter().lat.toFixed(4);
      const newZoom = map.current.getZoom().toFixed(2);
      setViewport({ lat: newLat, long: newLong, zoom: newZoom });
    });
  }, []);

  useEffect(() => {
    function removeMarkers() {
      //remove all umbrella markers
      markers.map((marker) => {
        marker.remove();
      });
    }
    //solve a map bound that contains all umbrella coordinates
    function getBounds(routeCoordinates) {
      //calculate the bounds of the specific route
      return routeCoordinates.reduce(function (bounds, coord) {
        return bounds.extend(coord);
      }, new maplibregl.LngLatBounds(routeCoordinates[0], routeCoordinates[0]));
    }
    //save coordinates and find new updated bounds
    const coordinates = [];
    //marker array  for later deletion
    const markerArray = [];

    //mode 1: show all umbrella on map
    if (mode == 1) {
      //remove all other previous markers
      removeMarkers();
      //get rid of previous route
      if (map.current.getLayer("routes")) {
        //route removal
        map.current.removeLayer("routes");
        map.current.removeSource("routes");
      }

      Object.keys(umbrellas).map((key) => {
        //store coordinates
        const loc = umbrellas[key].at(-1);
        coordinates.push([loc.lng, loc.lat]);
        //create marker for the umbrella
        const el = createUmbrellaElement();
        let marker;
        marker = new maplibregl.Marker({
          element: el,
          rotationAlignment: "map",
        })
          .setLngLat(loc)
          .addTo(map.current);
        markerArray.push(marker);
      });
    } else {
      //remove all other previous markers
      removeMarkers();

      //connection previous location with a route layer

      //add all other previous location as a dot marker
      const umbrellaHist = umbrellas[umID];
      const size = umbrellaHist.length;

      //array for connectin previous locations as source feature
      const prevConnect = [];
      umbrellaHist.map((loc, i) => {
        coordinates.push([loc.lng, loc.lat]);
        //create marker for the umbrella and dot marker for all past loc
        let el;
        if (i != size - 1) {
          el = createDotElement();
          //push each feature connecting two previous points together sequentially
          const nextPoint = umbrellaHist.at(i + 1);
          prevConnect.push({
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: [coordinates.at(-1), [nextPoint.lng, nextPoint.lat]],
            },
          });
        } else {
          el = createUmbrellaElement();
        }
        let marker;
        marker = new maplibregl.Marker({
          element: el,
          rotationAlignment: "map",
        })
          .setLngLat(loc)
          .addTo(map.current);
        markerArray.push(marker);
      });

      map.current.addSource("routes", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: prevConnect,
        },
      });
      map.current.addLayer(
        {
          id: "routes",
          type: "line",
          source: "routes",
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "red",
            "line-width": 2,
          },
        },
        "watername_ocean" //putting above this symbol layer(specific to applied style) for removing glitches
      );
    }
    //update the map to the new bounds gotten from umbrella coordinates so that all umbrellas
    //show up on map
    map.current.fitBounds(getBounds(coordinates), {
      padding: { top: 30, bottom: 30, left: 30, right: 30 },
      duration: 500,
    });
    //save the umbrella markers for later deletion
    setMarkers(markerArray);
  }, [mode]);

  function changeMode() {
    setMode(mode * -1);
  }
  /*****************************************************************************/
  return (
    <>
      <div className={styles.appContainer}>
        <div ref={mapContainer} className={styles.mapContainer} />
        <div className={cx(styles.resetButton)} onClick={changeMode}>
          {mode == 1 ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="35px"
              width="35px"
              fill="white"
              viewBox="0 0 24 24"
            >
              <title>book-open-page-variant</title>
              <path d="M19 2L14 6.5V17.5L19 13V2M6.5 5C4.55 5 2.45 5.4 1 6.5V21.16C1 21.41 1.25 21.66 1.5 21.66C1.6 21.66 1.65 21.59 1.75 21.59C3.1 20.94 5.05 20.5 6.5 20.5C8.45 20.5 10.55 20.9 12 22C13.35 21.15 15.8 20.5 17.5 20.5C19.15 20.5 20.85 20.81 22.25 21.56C22.35 21.61 22.4 21.59 22.5 21.59C22.75 21.59 23 21.34 23 21.09V6.5C22.4 6.05 21.75 5.75 21 5.5V19C19.9 18.65 18.7 18.5 17.5 18.5C15.8 18.5 13.35 19.15 12 20V6.5C10.55 5.4 8.45 5 6.5 5Z" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="35px"
              width="35px"
              viewBox="0 0 24 24"
              fill="white"
            >
              <title>umbrella</title>
              <path d="M12,2A9,9 0 0,1 21,11H13V19A3,3 0 0,1 10,22A3,3 0 0,1 7,19V18H9V19A1,1 0 0,0 10,20A1,1 0 0,0 11,19V11H3A9,9 0 0,1 12,2Z" />
            </svg>
          )}
        </div>
      </div>
    </>
  );
}

export default App;
