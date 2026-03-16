const DEVICES = [
  { id: "galaxy-s24", label: "Android Compact", name: "Galaxy S24 계열", width: 360, height: 780 },
  { id: "galaxy-z-fold-cover", label: "Fold Cover", name: "Galaxy Z Fold 커버", width: 344, height: 882 },
  { id: "galaxy-z-fold-inner", label: "Fold Main", name: "Galaxy Z Fold 메인", width: 844, height: 1138 },
  { id: "galaxy-z-flip", label: "Flip", name: "Galaxy Z Flip", width: 426, height: 1011 },
  { id: "iphone-se", label: "iOS Small", name: "iPhone SE", width: 375, height: 667 },
  { id: "iphone-pro", label: "iOS Tall", name: "iPhone 15 / 16 Pro 계열", width: 393, height: 852 },
  { id: "android-large", label: "Android Large", name: "Pixel / Galaxy Ultra 계열", width: 412, height: 915 },
  { id: "iphone-max", label: "iOS Max", name: "iPhone Pro Max 계열", width: 430, height: 932 }
];

const MODES = [
  { key: "fixed", label: "고정" },
  { key: "fluid", label: "FLUID" },
  { key: "fill", label: "FILL" }
];

const PRESETS = {
  parent: [
    { value: "300x250", width: 300, height: 250 },
    { value: "320x180", width: 320, height: 180 },
    { value: "360x240", width: 360, height: 240 }
  ],
  image: [
    { value: "1200x628", width: 1200, height: 628 },
    { value: "1080x1350", width: 1080, height: 1350 },
    { value: "1080x1080", width: 1080, height: 1080 }
  ]
};

let inputs;

let deviceSelect;
let modeGrid;
let modeTemplate;
let parentPresetSelect;
let imagePresetSelect;

let selectedDeviceName;
let selectedDeviceSize;
let selectedDeviceRatio;
let selectedDeviceNote;
let summaryDevice;
let summaryParent;
let summaryImage;
let summaryAspect;

const state = {
  deviceId: DEVICES[0].id
};

function cacheDom() {
  inputs = {
    parentWidth: document.querySelector("#parent-width"),
    parentHeight: document.querySelector("#parent-height"),
    imageWidth: document.querySelector("#image-width"),
    imageHeight: document.querySelector("#image-height")
  };

  deviceSelect = document.querySelector("#device-select");
  modeGrid = document.querySelector("#mode-grid");
  modeTemplate = document.querySelector("#mode-template");
  parentPresetSelect = document.querySelector("#parent-preset-select");
  imagePresetSelect = document.querySelector("#image-preset-select");

  selectedDeviceName = document.querySelector("#selected-device-name");
  selectedDeviceSize = document.querySelector("#selected-device-size");
  selectedDeviceRatio = document.querySelector("#selected-device-ratio");
  selectedDeviceNote = document.querySelector("#selected-device-note");
  summaryDevice = document.querySelector("#summary-device");
  summaryParent = document.querySelector("#summary-parent");
  summaryImage = document.querySelector("#summary-image");
  summaryAspect = document.querySelector("#summary-aspect");
}

function round(value) {
  return Math.round(value);
}

function formatSize(width, height) {
  return `${round(width)} x ${round(height)}`;
}

function formatAspect(width, height) {
  if (width >= height) {
    return `${Number((width / height).toFixed(2))}:1`;
  }

  return `1:${Number((height / width).toFixed(2))}`;
}

function safeValue(input, fallback) {
  const numeric = Number(input.value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

function clampParent(parent, device) {
  return {
    width: Math.min(parent.width, device.width),
    height: Math.min(parent.height, device.height)
  };
}

function contain(parent, image) {
  const scale = Math.min(parent.width / image.width, parent.height / image.height);
  return {
    width: round(image.width * scale),
    height: round(image.height * scale)
  };
}

function cover(parent, image) {
  const scale = Math.max(parent.width / image.width, parent.height / image.height);
  return {
    width: round(image.width * scale),
    height: round(image.height * scale)
  };
}

function calculateMode(mode, device, inputParent, image) {
  if (mode === "fixed") {
    const parent = clampParent(inputParent, device);
    const fittedImage = contain(parent, image);
    const marginX = Math.max(0, parent.width - fittedImage.width);
    const marginY = Math.max(0, parent.height - fittedImage.height);

    return {
      parent,
      image: fittedImage,
      marginX,
      marginY,
      parentClamped: parent.width !== inputParent.width || parent.height !== inputParent.height
    };
  }

  if (mode === "fluid") {
    const parentWidth = Math.min(inputParent.width, device.width);
    const parentHeight = round(parentWidth * (image.height / image.width));

    return {
      parent: {
        width: parentWidth,
        height: parentHeight
      },
      image: {
        width: parentWidth,
        height: parentHeight
      },
      overflowY: Math.max(0, parentHeight - device.height),
      parentClamped: parentWidth !== inputParent.width
    };
  }

  const parent = clampParent(inputParent, device);
  const coveredImage = cover(parent, image);

  return {
    parent,
    image: coveredImage,
    cropX: Math.max(0, coveredImage.width - parent.width),
    cropY: Math.max(0, coveredImage.height - parent.height),
    parentClamped: parent.width !== inputParent.width || parent.height !== inputParent.height
  };
}

function analyzeEffect(mode, metrics, inputParent) {
  if (mode === "fixed") {
    const effects = [];

    if (metrics.parentClamped) {
      effects.push("기기 폭에 맞춰 부모 축소");
    }
    if (metrics.marginX > 0) {
      effects.push(`좌우 여백 ${round(metrics.marginX / 2)}px`);
    }
    if (metrics.marginY > 0) {
      effects.push(`상하 여백 ${round(metrics.marginY / 2)}px`);
    }
    if (effects.length === 0) {
      effects.push("여백 없이 비율 유지");
    }

    return effects.join(" / ");
  }

  if (mode === "fluid") {
    const effects = [`부모 높이 ${inputParent.height}px는 고정값 아님`];

    if (metrics.overflowY > 0) {
      effects.push(`세로 ${metrics.overflowY}px overflow`);
    } else {
      effects.push("세로 자동 재계산");
    }

    return effects.join(" / ");
  }

  const effects = [];

  if (metrics.cropX > 0) {
    effects.push(`좌우 crop ${round(metrics.cropX / 2)}px`);
  }
  if (metrics.cropY > 0) {
    effects.push(`상하 crop ${round(metrics.cropY / 2)}px`);
  }
  if (metrics.parentClamped) {
    effects.push("기기 폭에 맞춰 부모 축소");
  }
  if (effects.length === 0) {
    effects.push("crop 없이 꽉 채움");
  }

  return effects.join(" / ");
}

function getPrimaryEffect(mode, metrics, inputParent) {
  if (mode === "fixed") {
    if (metrics.marginY > 0) {
      return `상하 여백 ${round(metrics.marginY / 2)}px`;
    }
    if (metrics.marginX > 0) {
      return `좌우 여백 ${round(metrics.marginX / 2)}px`;
    }
    if (metrics.parentClamped) {
      return "기기 폭에 맞춰 축소";
    }

    return "비율 유지로 딱 맞춤";
  }

  if (mode === "fluid") {
    if (metrics.overflowY > 0) {
      return `세로 ${metrics.overflowY}px overflow`;
    }

    return `세로 ${metrics.parent.height}px로 재계산`;
  }

  if (metrics.cropX > 0) {
    return `좌우 crop ${round(metrics.cropX / 2)}px`;
  }
  if (metrics.cropY > 0) {
    return `상하 crop ${round(metrics.cropY / 2)}px`;
  }
  if (metrics.parentClamped) {
    return "기기 폭에 맞춰 축소";
  }

  return "crop 없이 꽉 채움";
}

function describeFixed(metrics) {
  let text = `부모 ${formatSize(metrics.parent.width, metrics.parent.height)}를 유지하고 이미지는 비율을 보존한 채 ${formatSize(metrics.image.width, metrics.image.height)}로 맞춰집니다.`;

  if (metrics.marginY > 0) {
    text += ` 상하에 ${round(metrics.marginY / 2)}px씩 빈 공간이 남습니다.`;
  } else if (metrics.marginX > 0) {
    text += ` 좌우에 ${round(metrics.marginX / 2)}px씩 빈 공간이 남습니다.`;
  } else {
    text += " 여백 없이 들어가지만 cover가 아니라 비율 유지 상태입니다.";
  }

  if (metrics.parentClamped) {
    text += " 입력한 부모가 기기보다 크면 먼저 기기 크기에 맞춰 줄어듭니다.";
  }

  return text;
}

function describeFluid(metrics, inputParent) {
  let text = `가로는 부모 폭 ${metrics.parent.width}px를 모두 사용하고 세로는 이미지 비율로 ${metrics.parent.height}px가 다시 계산됩니다.`;
  text += ` 입력한 부모 높이 ${inputParent.height}px는 레이아웃 고정값으로 직접 쓰이지 않습니다.`;

  if (metrics.overflowY > 0) {
    text += ` 이 기기에서는 계산된 높이가 화면보다 ${metrics.overflowY}px 커서 아래로 넘칠 수 있습니다.`;
  }

  return text;
}

function describeFill(metrics) {
  let text = `부모 ${formatSize(metrics.parent.width, metrics.parent.height)}를 빈 공간 없이 채우기 위해 이미지를 ${formatSize(metrics.image.width, metrics.image.height)}로 키웁니다.`;

  if (metrics.cropX > 0) {
    text += ` 그래서 좌우가 ${round(metrics.cropX / 2)}px씩 잘립니다.`;
  } else if (metrics.cropY > 0) {
    text += ` 그래서 상하가 ${round(metrics.cropY / 2)}px씩 잘립니다.`;
  } else {
    text += " 부모와 이미지 비율이 같아 잘림 없이 꽉 찹니다.";
  }

  if (metrics.parentClamped) {
    text += " 입력한 부모가 기기보다 크면 먼저 기기 크기에 맞춰 줄어듭니다.";
  }

  return text;
}

function buildSelectedDeviceNote(device, inputParent, image) {
  const fixed = calculateMode("fixed", device, inputParent, image);
  const fluid = calculateMode("fluid", device, inputParent, image);
  const fill = calculateMode("fill", device, inputParent, image);

  return `${device.name} 해상도(${formatSize(device.width, device.height)}) 기준 시뮬레이션입니다. 고정(FIXED)은 ${getPrimaryEffect("fixed", fixed, inputParent)}, FLUID는 ${getPrimaryEffect("fluid", fluid, inputParent)}, FILL은 ${getPrimaryEffect("fill", fill, inputParent)} 상태로 렌더링 됩니다.`;
}

function getSelectedDevice() {
  return DEVICES.find((device) => device.id === state.deviceId) ?? DEVICES[0];
}

function updateDevicePickerUI() {
  deviceSelect.value = state.deviceId;
}

function setSelectedDevice(deviceId) {
  state.deviceId = DEVICES.some((device) => device.id === deviceId) ? deviceId : DEVICES[0].id;
  updateDevicePickerUI();
  render();
}

function findPresetValue(items, width, height) {
  const preset = items.find((item) => item.width === width && item.height === height);
  return preset?.value ?? "custom";
}

function updatePresetSelects(inputParent, image) {
  parentPresetSelect.value = findPresetValue(PRESETS.parent, inputParent.width, inputParent.height);
  imagePresetSelect.value = findPresetValue(PRESETS.image, image.width, image.height);
}

function applyPreset(target, value) {
  if (value === "custom") {
    return;
  }

  const preset = PRESETS[target].find((item) => item.value === value);
  if (!preset) {
    return;
  }

  if (target === "parent") {
    inputs.parentWidth.value = preset.width;
    inputs.parentHeight.value = preset.height;
  } else {
    inputs.imageWidth.value = preset.width;
    inputs.imageHeight.value = preset.height;
  }

  render();
}

function buildModeCard(mode, device, inputParent, image) {
  const fragment = modeTemplate.content.cloneNode(true);
  const root = fragment.querySelector(".mode-card");
  const pill = fragment.querySelector(".mode-pill");
  const metric = fragment.querySelector(".mode-metric");
  const highlight = fragment.querySelector(".mode-highlight-value");
  const phoneScreen = fragment.querySelector(".phone-screen");
  const placementLayer = fragment.querySelector(".placement-layer");
  const imageLayer = fragment.querySelector(".image-layer");
  const parentMetric = fragment.querySelector(".metric-parent");
  const imageMetric = fragment.querySelector(".metric-image");
  const description = fragment.querySelector(".mode-description");
  const result = calculateMode(mode.key, device, inputParent, image);

  root.classList.add(`is-${mode.key}`);
  pill.textContent = mode.label === '고정' ? '고정 (FIXED)' : mode.label;
  metric.textContent = `Target: ${formatSize(device.width, device.height)}`;
  highlight.textContent = getPrimaryEffect(mode.key, result, inputParent);

  const scale = Math.min(230 / device.width, 236 / device.height);
  const previewWidth = round(device.width * scale);
  const previewHeight = round(device.height * scale);
  const scaleBase = Math.max(scale, 0.65);
  const borderWidth = Math.max(4, round(8 * scaleBase));
  const phoneRadius = Math.max(16, round(26 * scaleBase));
  const placementRadius = Math.max(10, round(18 * scaleBase));
  const notchTop = Math.max(5, round(10 * scaleBase));
  const notchHeight = Math.max(6, round(12 * scaleBase));
  const labelFontSize = Math.max(8, round(11 * scaleBase));
  const labelOffsetX = Math.max(5, round(10 * scaleBase));
  const labelOffsetY = Math.max(4, round(8 * scaleBase));
  const labelPadX = Math.max(5, round(8 * scaleBase));
  const labelPadY = Math.max(3, round(5 * scaleBase));

  const frameWidth = previewWidth + borderWidth * 2;
  const frameHeight = previewHeight + borderWidth * 2;

  phoneScreen.style.width = `${frameWidth}px`;
  phoneScreen.style.height = `${frameHeight}px`;
  phoneScreen.style.setProperty("--phone-border", `${borderWidth}px`);
  phoneScreen.style.setProperty("--phone-radius", `${phoneRadius}px`);
  phoneScreen.style.setProperty("--placement-radius", `${placementRadius}px`);
  phoneScreen.style.setProperty("--notch-top", `${notchTop}px`);
  phoneScreen.style.setProperty("--notch-height", `${notchHeight}px`);
  phoneScreen.style.setProperty("--label-font-size", `${labelFontSize}px`);
  phoneScreen.style.setProperty("--label-offset-x", `${labelOffsetX}px`);
  phoneScreen.style.setProperty("--label-offset-y", `${labelOffsetY}px`);
  phoneScreen.style.setProperty("--label-pad-x", `${labelPadX}px`);
  phoneScreen.style.setProperty("--label-pad-y", `${labelPadY}px`);

  const scaledParentWidth = round(result.parent.width * scale);
  const scaledParentHeight = round(result.parent.height * scale);
  const parentTop = (previewHeight - scaledParentHeight) / 2;
  const parentLeft = (previewWidth - scaledParentWidth) / 2;

  placementLayer.style.width = `${scaledParentWidth}px`;
  placementLayer.style.height = `${scaledParentHeight}px`;
  placementLayer.style.left = `${round(parentLeft)}px`;
  placementLayer.style.top = `${round(parentTop)}px`;

  const scaledImageWidth = round(result.image.width * scale);
  const scaledImageHeight = round(result.image.height * scale);
  const imageLeft = (scaledParentWidth - scaledImageWidth) / 2;
  const imageTop = (scaledParentHeight - scaledImageHeight) / 2;

  imageLayer.style.width = `${scaledImageWidth}px`;
  imageLayer.style.height = `${scaledImageHeight}px`;
  imageLayer.style.left = `${round(imageLeft)}px`;
  imageLayer.style.top = `${round(imageTop)}px`;

  if (mode.key === "fluid") {
    imageLayer.style.left = "0px";
    imageLayer.style.top = "0px";
  }

  parentMetric.textContent = formatSize(result.parent.width, result.parent.height);
  imageMetric.textContent = formatSize(result.image.width, result.image.height);

  if (mode.key === "fixed") {
    description.textContent = describeFixed(result);
  } else if (mode.key === "fluid") {
    description.textContent = describeFluid(result, inputParent);
  } else {
    description.textContent = describeFill(result);
  }

  return fragment;
}

function render() {
  const device = getSelectedDevice();
  const inputParent = {
    width: safeValue(inputs.parentWidth, 320),
    height: safeValue(inputs.parentHeight, 180)
  };
  const image = {
    width: safeValue(inputs.imageWidth, 1200),
    height: safeValue(inputs.imageHeight, 628)
  };

  selectedDeviceName.textContent = device.name;
  selectedDeviceSize.textContent = `${formatSize(device.width, device.height)}`;
  selectedDeviceRatio.textContent = `Target Ratio ${formatAspect(device.width, device.height)}`;
  summaryDevice.textContent = device.name;
  summaryParent.textContent = formatSize(inputParent.width, inputParent.height);
  summaryImage.textContent = formatSize(image.width, image.height);
  summaryAspect.textContent = `Ratio ${formatAspect(image.width, image.height)}`;
  selectedDeviceNote.textContent = buildSelectedDeviceNote(device, inputParent, image);
  updatePresetSelects(inputParent, image);

  modeGrid.innerHTML = "";
  MODES.forEach((mode) => {
    modeGrid.appendChild(buildModeCard(mode, device, inputParent, image));
  });
}

function bindEvents() {
  deviceSelect.addEventListener("change", (event) => {
    setSelectedDevice(event.target.value);
  });

  Object.values(inputs).forEach((input) => {
    input.addEventListener("input", render);
  });

  parentPresetSelect.addEventListener("change", (event) => {
    applyPreset("parent", event.target.value);
  });

  imagePresetSelect.addEventListener("change", (event) => {
    applyPreset("image", event.target.value);
  });
}

function init() {
  cacheDom();

  if (
    !deviceSelect ||
    !modeGrid ||
    !modeTemplate ||
    !parentPresetSelect ||
    !imagePresetSelect
  ) {
    return;
  }

  state.deviceId = deviceSelect.value || DEVICES[0].id;
  bindEvents();
  updateDevicePickerUI();
  render();
}

window.addEventListener("load", init, { once: true });
