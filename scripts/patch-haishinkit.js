const fs = require('fs');
const path = require('path');

const TAG = '[patch-haishinkit]';

const SWIFT_FILE = path.resolve(__dirname, '../ios/Pods/HaishinKit/Sources/IO/AudioNode.swift');

const REPLACEMENTS = [
    {
        name: 'MixerNode',
        from: `final class MixerNode: AudioNode {
    private var mixerComponentDescription = AudioComponentDescription(
        componentType: kAudioUnitType_Mixer,
        componentSubType: kAudioUnitSubType_MultiChannelMixer,
        componentManufacturer: kAudioUnitManufacturer_Apple,
        componentFlags: 0,
        componentFlagsMask: 0)

    init(format: AVAudioFormat) throws {
        try super.init(description: &mixerComponentDescription)
    }
`,
        to: `final class MixerNode: AudioNode {
    init(format: AVAudioFormat) throws {
        var mixerComponentDescription = AudioComponentDescription(
            componentType: kAudioUnitType_Mixer,
            componentSubType: kAudioUnitSubType_MultiChannelMixer,
            componentManufacturer: kAudioUnitManufacturer_Apple,
            componentFlags: 0,
            componentFlagsMask: 0)
        try super.init(description: &mixerComponentDescription)
    }
`,
    },
    {
        name: 'OutputNode property',
        from: `final class OutputNode: AudioNode {
    private var outputComponentDescription = AudioComponentDescription(
        componentType: kAudioUnitType_Output,
        componentSubType: kAudioUnitSubType_GenericOutput,
        componentManufacturer: kAudioUnitManufacturer_Apple,
        componentFlags: 0,
        componentFlagsMask: 0)

    var format: AVAudioFormat {
`,
        to: `final class OutputNode: AudioNode {
    var format: AVAudioFormat {
`,
    },
    {
        name: 'OutputNode initializer',
        from: `        self.buffer = buffer
        try super.init(description: &outputComponentDescription)
`,
        to: `        self.buffer = buffer
        var outputComponentDescription = AudioComponentDescription(
            componentType: kAudioUnitType_Output,
            componentSubType: kAudioUnitSubType_GenericOutput,
            componentManufacturer: kAudioUnitManufacturer_Apple,
            componentFlags: 0,
            componentFlagsMask: 0)
        try super.init(description: &outputComponentDescription)
`,
    },
];

function fail(message) {
    console.error(`${TAG} ${message}`);
    process.exit(1);
}

function count(source, needle) {
    return source.split(needle).length - 1;
}

function writeLocked(file, source) {
    const mode = fs.statSync(file).mode;
    fs.chmodSync(file, mode | 0o200);
    try {
        fs.writeFileSync(file, source, 'utf8');
    } finally {
        fs.chmodSync(file, mode);
    }
}

function main() {
    if (!fs.existsSync(SWIFT_FILE)) {
        console.log(`${TAG} HaishinKit pod not installed yet, nothing to patch.`);
        return;
    }

    const original = fs.readFileSync(SWIFT_FILE, 'utf8');
    let source = original;

    for (const { name, from, to } of REPLACEMENTS) {
        const pending = count(source, from);

        if (pending === 0 && count(source, to) === 1) {
            continue;
        }

        if (pending !== 1) {
            fail(
                `Unexpected source for ${name} in ${SWIFT_FILE}. HaishinKit may have changed version, so the patch was not applied.`,
            );
        }

        source = source.replace(from, () => to);
    }

    if (source === original) {
        console.log(`${TAG} AudioNode.swift already patched.`);
        return;
    }

    writeLocked(SWIFT_FILE, source);

    console.log(`${TAG} Patched AudioNode.swift initializers.`);
}

main();
