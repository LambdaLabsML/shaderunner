
// tell typescript that data-urls are ok to import
declare module 'data-url:*' {
    const content: string;
    export default content;
}