const { withPodfile } = require('expo/config-plugins');

const MARKER = 'patch-haishinkit.js';
const ANCHOR = /^( *)post_install do \|installer\|\n/m;

function withHaishinKitPatch(config) {
    return withPodfile(config, (podfile) => {
        const contents = podfile.modResults.contents;

        if (contents.includes(MARKER)) {
            return podfile;
        }

        if (!ANCHOR.test(contents)) {
            throw new Error(
                'withHaishinKitPatch: no post_install block found in the Podfile, so the HaishinKit patch hook was not added.',
            );
        }

        podfile.modResults.contents = contents.replace(
            ANCHOR,
            (block, indent) =>
                `${block}${indent}  system('node', File.join(__dir__, '..', 'scripts', '${MARKER}')) || raise('HaishinKit patch failed')\n`,
        );

        return podfile;
    });
}

module.exports = withHaishinKitPatch;
