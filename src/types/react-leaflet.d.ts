// A local declaration to fix TS2307 for react-leaflet if the @types package cannot be installed
declare module 'react-leaflet' {
    import * as React from 'react';
    import * as L from 'leaflet';

    export class MapContainer extends React.Component<any> { }
    export class ImageOverlay extends React.Component<any> { }
    export class Marker extends React.Component<any> { }
    export class Popup extends React.Component<any> { }
    export function useMapEvents(handlers: any): any;
}
