import type {
  TabProps} from '@shopify/polaris';
import {
  Page,
  Card, 
  Tabs,
  TextField,
  Button,
  InlineGrid,
  Box,
  Divider,
  BlockStack,
  IndexTable,
  Text,
  InlineStack,
  DropZone,
  Thumbnail,
  Combobox,
  Icon,
  Listbox,
  Tag,
  Spinner,
  Collapsible,
  ProgressBar,
  InlineError,
  EmptySearchResult,
  Banner,
  Checkbox,
  Select
} from '@shopify/polaris';
import { CheckIcon, DeleteIcon, EditIcon, PlusIcon, RefreshIcon, XIcon } from '@shopify/polaris-icons';
import { useState, useCallback, useMemo, useEffect } from 'react';
import type {
  SubmitFunction} from "@remix-run/react";
import {
  useActionData,
  useLoaderData,
  useSubmit
} from "@remix-run/react";

import type {
  Vendor
} from "../models/Vendor.server";
import {
  getVendors,
  createVendor,
  updateVendor,
  deleteVendor
} from "../models/Vendor.server";

import type {
  VendorColor,
  VendorColorUpdate
} from "../models/VendorColor.server";
import {
  createVendorColor,
  updateVendorColor,
  upsertVendorColor,
  upsertManyVendorColor,
  deleteVendorColor,
  stageColorImage,
  uploadColorImage,
  uploadColorImagesBulk
} from "../models/VendorColor.server";

import type {
  VendorColorTag
} from "../models/VendorColorTag.server";
import {
  getVendorColorTags,
  createVendorColorTag,
  deleteVendorColorTag,
  createManyVendorColorTags
} from "../models/VendorColorTag.server";

import { authenticate } from 'app/shopify.server';
import { handleize, fiberFileSuffix } from 'app/utils';

enum Action {
  CreateVendor = "CreateVendor",
  UpdateVendor = "UpdateVendor",
  DeleteVendor = "DeleteVendor",
  CreateVendorColor = "CreateVendorColor",
  UpdateVendorColor = "UpdateVendorColor",
  UpsertVendorColor = "UpsertVendorColor",
  UpsertManyVendorColor = "UpsertManyVendorColor",
  DeleteVendorColor = "DeleteVendorColor",
  StageColorImage = "StageColorImage",
  UploadColorImage = "UploadColorImage",
  UploadColorImagesBulk = "UploadColorImagesBulk",
  SyncAltText = "SyncAltText",
  GetVendorColorTags = "GetVendorColorTags",
  CreateVendorColorTag = "CreateVendorColorTag",
  CreateManyVendorColorTags = "CreateManyVendorColorTags",
  DeleteVendorColorTag = "DeleteVendorColorTag"
}

const COLOR_GROUPS = [
  {value: 'brunettes', label: 'Brunettes'},
  {value: 'blondes', label: 'Blondes'},
  {value: 'blacks', label: 'Blacks'},
  {value: 'grays', label: 'Grays'},
  {value: 'reds', label: 'Reds'},
  {value: 'fashion-color', label: 'Fashion Colors'},
  {value: 'exclusive-color', label: 'Exclusive Colors'},
];

const FIBERS = [
  {value: 'Synthetic', label: 'Synthetic'},
  {value: 'Heat Friendly Synthetic', label: 'Heat Friendly Synthetic'},
  {value: 'Human Hair', label: 'Human Hair'},
  {value: 'Human Hair/Synthetic Blend', label: 'Human Hair/Synthetic Blend'}
];

const TEMPERATURES = [
  {value: '', label: ''},
  {value: 'cool', label: 'Cool'},
  {value: 'warm', label: 'Warm'},
  {value: 'neutral', label: 'Neutral'}
];

type vendorColorProperties = "color" | "altText" | "fileName" | "fiber" | "colorName" | "colorDesc" | "temp" | "rooted" | "highlighted" | "truColorSrc" | "groups" | "features" | "shopImageIds";

/*
const PROPERTIES: vendorColorProperties[] = ["color", "altText", "fileName", "fiber", "colorName", "colorDesc", "temp", "truColorSrc", "groups", "features", "shopImageIds"];

const TYPED_PROPERTIES = {
  string: ["color", "altText", "fileName", "fiber", "colorName", "colorDesc", "temp", "truColorSrc"],
  array: ["groups", "features"],
  object: ["shopImageIds"]
};
*/

export const useDebounce = (funct: ((...args: any[]) => void), delay = 500) => {
  const [timer, setTimer] = useState<NodeJS.Timeout>();

  const debouncedFunct = ((...args: any[]) => {
    const newTimer = setTimeout(() => funct(...args), delay);

    clearTimeout(timer);
    setTimer(newTimer);
  });

  useEffect(() => {
    return () => {
      if (!timer) {
        return;
      }

      clearTimeout(timer);
    };
  }, []);

  return debouncedFunct;
}

type VendorColorType = Omit<VendorColor, "vendor" | "groups" | "shopImageIds" | "rooted" | "highlighted" | "features"> & {
  groups?: string,
  rooted?: string,
  highlighted?: string,
  features?: string,
  truColorSrc?: string
}

export async function loader() {
  const vendors = await getVendors();
  const vendorColorTags = await getVendorColorTags();

  return Response.json({vendors, vendorColorTags});
}

export async function action({ request }: {request: Request }) {
  const { admin, session } = await authenticate.admin(request);
  const { shop } = session;

  const data: any = {
    ...Object.fromEntries(await request.formData()),
  };

  switch (data.actionType) {
    case Action.CreateVendor:
      return await createVendor(data.vendorName);
    case Action.UpdateVendor:
      return await updateVendor(data.vendorName, JSON.parse(data.vendorUpdate));
    case Action.DeleteVendor:
      return await deleteVendor(data.vendorName);
    case Action.CreateVendorColor:
      return await createVendorColor(data.vendorName, data.color, data.fiber, JSON.parse(data.groups));
    case Action.UpdateVendorColor:
      return await updateVendorColor(data.vendorName, data.color, data.fiber, JSON.parse(data.vendorColorUpdate));
    case Action.UpsertVendorColor:
      return await upsertVendorColor(data.vendorName, data.color, data.fiber, JSON.parse(data.vendorColorUpdate));
    case Action.UpsertManyVendorColor:
      return await upsertManyVendorColor(JSON.parse(data.vendorColors));
    case Action.DeleteVendorColor:
      return await deleteVendorColor(data.vendorName, data.color, data.fiber);
    case Action.StageColorImage:
      const stagedTargetResponse = await stageColorImage(admin.graphql, JSON.parse(data.file));

      return ({...stagedTargetResponse, color: data.color, fiber: data.fiber, altText: data.altText});
    case Action.UploadColorImage:
      return await uploadColorImage(admin.graphql, data.resourceUrl, data.color, data.fiber, data.altText, shop, data.vendorName, data.fileName);
    case Action.UploadColorImagesBulk:
      return await uploadColorImagesBulk(admin.graphql, shop, JSON.parse(data.images));
    case Action.SyncAltText:
      const imagesToUpdate = JSON.parse(data.imagesToUpdate).map((image: any) => ({
          "id": image.shopImageIds[shop],
          "alt": image.altText
        })
      ).filter((image: any) => !!image.id);

      const fileUpdateResponse = await admin.graphql(`
        mutation FileUpdate($input: [FileUpdateInput!]!) {
          fileUpdate(files: $input) {
            userErrors {
              code
              field
              message
            }
            files {
              id
              alt
            }
          }
        }
      `,
        {
          variables: {
            "input": imagesToUpdate
          }
        }
      );

      return await fileUpdateResponse.json();
    case Action.GetVendorColorTags:
      return await getVendorColorTags();
    case Action.CreateVendorColorTag:
      return await createVendorColorTag(data.tagName);
    case Action.CreateManyVendorColorTags:
      return await createManyVendorColorTags(JSON.parse(data.tagNames));
    case Action.DeleteVendorColorTag:
      return await deleteVendorColorTag(data.tagName);
  }

  return Response.json({ errors: ['Invalid data passed.'] }, { status: 422 });
}

export default function ColorGroups() {
  const submit = useSubmit();
  const loaderResponse = useLoaderData<{vendors: Vendor[], vendorColorTags: VendorColorTag[]}>();

  const [vendors, setVendors] = useState<Vendor[]>(loaderResponse.vendors ?? []);
  const [selected, setSelected] = useState<number>();
  const [openMoreActions, setOpenMoreActions] = useState(false);
  const [loadingSyncAltText, setLoadingSyncAltText] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [vendorColorTags, setVendorColorTags] = useState<VendorColorTag[]>(loaderResponse.vendorColorTags ?? []);

  const [openImportVendorColor, setOpenImportVendorColor] = useState(false);
  const [loadingImport, setLoadingImport] = useState<{active: boolean, progress: number, total: number}>({active: false, progress: 0, total: 0});
  const [pendingVendorColorsBulk, setPendingVendorColorsBulk] = useState<{
    upserted: boolean,
    data: VendorColorType
  }[]>([]);
  const [vendorColorsFailed, setVendorColorsFailed] = useState('');
  const [importOverride, setImportOverride] = useState(false);
  const actionData = useActionData<any>();

  const vendorTabs = useMemo(() => vendors?.length ? vendors.map((vendor) => vendor.name) : [], [vendors]);
  const currentVendor = useMemo(() => selected ? vendors[selected] : vendors[0], [vendors, selected]);

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const submitSearch = useDebounce(setSearch);

  useEffect(() => {
    let queryParams = new URLSearchParams(window.location.search);

    if (queryParams.has('vendorName')) {
      let vendorIndex = vendors.findIndex((vendor) => vendor.name == queryParams.get('vendorName'))

      if (vendorIndex > -1) {
        setSelected(vendorIndex);
      }
    }
  }, []);

  useEffect(() => {
    submitSearch(searchInput);
  }, [searchInput]);

  /* MUTATE VENDORS */

  const onCreateVendor = useCallback(async (value: string) => {
    await sleep(500);

    submit({
      actionType: Action.CreateVendor,
      vendorName: value
    }, { method: "POST" });

    setVendors((prev) => [...prev, { name: value, colors: [] }]);

    return true;
  }, [submit]);

  const onUpdateVendor = useCallback(async (value: string) => {
    await sleep(1);

    submit({
      actionType: Action.UpdateVendor,
      vendorName: currentVendor.name,
      vendorUpdate: JSON.stringify({ name: value })
    }, { method: "PUT" });

    currentVendor.name = value;
    setVendors((prev) => [...prev]);

    return true;
  }, [currentVendor, submit]);

  const onDeleteVendor = useCallback(async () => {
    await sleep(1);

    submit({
      actionType: Action.DeleteVendor,
      vendorName: currentVendor.name
    }, { method: "DELETE" });

    setVendors((prev) => prev.filter((vendor) => vendor.name !== currentVendor.name));
    setSelected(0);

    return true;
  }, [currentVendor, submit]);

  /* MUTATE VENDOR COLOR TAGS */

  const onCreateVendorColorTag = useCallback(async (tagName: string) => {
    await sleep(500);

    submit({
      actionType: Action.CreateVendorColorTag,
      tagName
    }, { method: "POST" });

    setVendorColorTags((prev) => [...prev, { name: tagName }]);

    return true;
  }, [submit]);

  const onCreateManyVendorColorTags = useCallback(async (tagNames: string[]) => {
    await sleep(500);

    submit({
      actionType: Action.CreateManyVendorColorTags,
      tagNames: JSON.stringify(tagNames)
    }, { method: "POST" });

    setVendorColorTags((prev) => [...prev, ...(tagNames.map((tag) => ({ name: tag })))]);

    return true;
  }, [submit]);

  const onDeleteVendorColorTag = useCallback((tagName: string) => async () => {
    await sleep(1);

    submit({
      actionType: Action.DeleteVendorColorTag,
      tagName
    }, { method: "DELETE" });

    setVendorColorTags((prev) => prev.filter((tag) => tag.name !== tagName));

    return true;
  }, [submit]);

  /* MUTATE VENDOR COLORS */

  const onAddVendorColor = useCallback(async (color: string, groups: string[], fiber: string) => {
    if (currentVendor.colors?.find((vendorColor) => vendorColor.color === color && vendorColor.fiber === fiber)) {
      return false;
    }

    const colorData = {
      vendorName: currentVendor.name,
      color,
      groups,
      shopImageIds: {},
      fiber,
      features: []
    };

    if (currentVendor.colors) {
      currentVendor.colors = [{...colorData}, ...currentVendor.colors];
    }
    else {
      currentVendor.colors = [{...colorData}];
    }

    await sleep(1);
    submit({
      actionType: Action.CreateVendorColor,
      vendorName: currentVendor.name,
      color,
      groups: JSON.stringify(groups),
      fiber
    }, { method: "POST" });

    setVendors((prev) => [...prev]);

    return true;
  }, [currentVendor, submit]);

  const onUpdateVendorColor = useCallback(async (color: string, fiber: string, vendorColorUpdate: VendorColorUpdate) => {

    const vendorColor = currentVendor.colors?.find((vendorColor) => vendorColor.color === color && vendorColor.fiber === fiber);

    if (vendorColor) {
      vendorColor.color = vendorColorUpdate.color ?? vendorColor.color;
      vendorColor.groups = vendorColorUpdate.groups ?? vendorColor.groups;
      vendorColor.imageSrc = vendorColorUpdate.imageSrc ?? vendorColor.imageSrc;
      vendorColor.shopImageIds = vendorColorUpdate.shopImageIds ?? vendorColor.shopImageIds;
      vendorColor.altText = vendorColorUpdate.altText ?? vendorColor.altText;
      vendorColor.fileName = vendorColorUpdate.fileName ?? vendorColor.fileName;
      vendorColor.fiber = vendorColorUpdate.fiber ?? vendorColor.fiber;
      vendorColor.colorName = vendorColorUpdate.colorName ?? vendorColor.colorName;
      vendorColor.colorDesc = vendorColorUpdate.colorDesc ?? vendorColor.colorDesc;
      vendorColor.temp = vendorColorUpdate.temp ?? vendorColor.temp;
      vendorColor.rooted = vendorColorUpdate.rooted ?? vendorColor.rooted;
      vendorColor.highlighted = vendorColorUpdate.highlighted ?? vendorColor.highlighted;
      vendorColor.features = vendorColorUpdate.features ?? vendorColor.features;
      vendorColor.truColorSrc = vendorColorUpdate.truColorSrc ?? vendorColor.truColorSrc
    }
    else {
      return;
    }

    await sleep(1);
    submit({
      actionType: Action.UpdateVendorColor,
      vendorName: currentVendor.name,
      color,
      vendorColorUpdate: JSON.stringify(vendorColorUpdate),
      fiber
    }, { method: "PUT" });

    setVendors((prev) => [...prev]);

    const tagNames = vendorColorTags.map((tag) => tag.name);
    const tagsToAdd = vendorColorUpdate.features?.filter((tagName) => !tagNames.includes(tagName)) ?? [];

    if (tagsToAdd.length) {
      onCreateManyVendorColorTags(tagsToAdd);
    }
  }, [currentVendor, submit, vendorColorTags, onCreateManyVendorColorTags]);

  const onUpsertManyVendorColor = useCallback(async (vendorColorsUpsert: {vendorName: string, color: string, fiber: string, vendorColorUpdate: VendorColorUpdate}[]) => {
    for (const vendorColorUpsert of vendorColorsUpsert) {
      const vendor = vendors.find((vendor) => vendor.name === vendorColorUpsert.vendorName);
      const vendorColor = vendor?.colors?.find((vendorColor) => vendorColor.color === vendorColorUpsert.color && vendorColor.fiber === vendorColorUpsert.fiber);

      // Set undefined to prevent overriding previous values
      if (vendorColor && !importOverride) {
        vendorColorUpsert.vendorColorUpdate.shopImageIds =  {...(vendorColorUpsert.vendorColorUpdate.shopImageIds ?? {}), ...(vendorColor.shopImageIds ?? {})};
        vendorColorUpsert.vendorColorUpdate.groups = vendorColor.groups.length ? undefined : vendorColorUpsert.vendorColorUpdate.groups;
        vendorColorUpsert.vendorColorUpdate.imageSrc = vendorColor.imageSrc ? undefined : vendorColorUpsert.vendorColorUpdate.imageSrc;
        vendorColorUpsert.vendorColorUpdate.altText = vendorColor.altText ? undefined : vendorColorUpsert.vendorColorUpdate.altText;
        vendorColorUpsert.vendorColorUpdate.fileName = vendorColor.fileName ? undefined : vendorColorUpsert.vendorColorUpdate.fileName;
        vendorColorUpsert.vendorColorUpdate.colorName = vendorColor.colorName ? undefined : vendorColorUpsert.vendorColorUpdate.colorName;
        vendorColorUpsert.vendorColorUpdate.colorDesc = vendorColor.colorDesc ? undefined : vendorColorUpsert.vendorColorUpdate.colorDesc;
        vendorColorUpsert.vendorColorUpdate.temp = vendorColor.temp ? undefined : vendorColorUpsert.vendorColorUpdate.temp;
        vendorColorUpsert.vendorColorUpdate.rooted = vendorColor.rooted ? undefined : vendorColorUpsert.vendorColorUpdate.rooted;
        vendorColorUpsert.vendorColorUpdate.highlighted = vendorColor.highlighted ? undefined : vendorColorUpsert.vendorColorUpdate.highlighted;
        vendorColorUpsert.vendorColorUpdate.features = vendorColor.features ? undefined : vendorColorUpsert.vendorColorUpdate.features;
        vendorColorUpsert.vendorColorUpdate.truColorSrc = vendorColor.truColorSrc ? undefined : vendorColorUpsert.vendorColorUpdate.truColorSrc;
      }

      if (vendorColor) {
        vendorColor.groups = vendorColorUpsert.vendorColorUpdate.groups ?? vendorColor.groups;
        vendorColor.imageSrc = vendorColorUpsert.vendorColorUpdate.imageSrc ?? vendorColor.imageSrc;
        vendorColor.altText = vendorColorUpsert.vendorColorUpdate.altText ?? vendorColor.altText;
        vendorColor.fileName = vendorColorUpsert.vendorColorUpdate.fileName ?? vendorColor.fileName;
        vendorColor.colorName = vendorColorUpsert.vendorColorUpdate.colorName ?? vendorColor.colorName;
        vendorColor.colorDesc = vendorColorUpsert.vendorColorUpdate.colorDesc ?? vendorColor.colorDesc;
        vendorColor.temp = vendorColorUpsert.vendorColorUpdate.temp ?? vendorColor.temp;
        vendorColor.rooted = vendorColorUpsert.vendorColorUpdate.rooted ?? vendorColor.rooted;
        vendorColor.highlighted = vendorColorUpsert.vendorColorUpdate.highlighted ?? vendorColor.highlighted;
        vendorColor.features = vendorColorUpsert.vendorColorUpdate.features ?? vendorColor.features;
        vendorColor.truColorSrc = vendorColorUpsert.vendorColorUpdate.truColorSrc ?? vendorColor.truColorSrc

        if (vendor?.colors) {
          vendor.colors = [...vendor.colors];
        }
      }
      else if (vendor) {
        const colorData = {
          vendorName: vendorColorUpsert.vendorName,
          color: vendorColorUpsert.color,
          groups: vendorColorUpsert.vendorColorUpdate.groups ?? [],
          shopImageIds: {},
          imageSrc: vendorColorUpsert.vendorColorUpdate.imageSrc ?? undefined,
          altText: vendorColorUpsert.vendorColorUpdate.altText ?? undefined,
          fiber: vendorColorUpsert.fiber,
          colorName: vendorColorUpsert.vendorColorUpdate.colorName ?? undefined,
          colorDesc: vendorColorUpsert.vendorColorUpdate.colorDesc ?? undefined,
          temp: vendorColorUpsert.vendorColorUpdate.temp ?? undefined,
          rooted: vendorColorUpsert.vendorColorUpdate.rooted ?? undefined,
          highlighted: vendorColorUpsert.vendorColorUpdate.highlighted ?? undefined,
          features: vendorColorUpsert.vendorColorUpdate.features ?? [],
          truColorSrc: vendorColorUpsert.vendorColorUpdate.truColorSrc ?? undefined
        };

        if (vendor.colors) {
          vendor.colors = [...vendor.colors, {...colorData}];
        }
        else {
          vendor.colors = [{...colorData}];
        }
      }
    }

    submit({
      actionType: Action.UpsertManyVendorColor,
      vendorColors: JSON.stringify(vendorColorsUpsert)
    }, { method: "PUT" });
    await sleep(1000);

    setLoadingImport((prev) => ({...prev, progress: Math.ceil(prev.progress + ((1 / prev.total) * 100 * vendorColorsUpsert.length))}));

    setVendors((prev) => [...prev]);
  }, [vendors, submit]);

  const onDeleteVendorColor = useCallback((color: string, fiber: string) => async () => {
    if (currentVendor.colors && currentVendor.colors) {
      currentVendor.colors = currentVendor.colors.filter((vendorColor) => vendorColor.color != color);
    }
    else {
      return;
    }

    await sleep(1);
    submit({
      actionType: Action.DeleteVendorColor,
      vendorName: currentVendor.name,
      color,
      fiber
    }, { method: "DELETE" });

    setVendors((prev) => [...prev]);
  }, [currentVendor, submit]);

  /* OTHER FUNCTIONALITY */

  const tabs: TabProps[] = vendorTabs.map((vendorTab, index) => ({
    content: vendorTab,
    index,
    onAction: () => {},
    id: `${vendorTab}-${index}`,
    actions:
      [
        {
          type: 'rename',
          onAction: () => {},
          onPrimaryAction: onUpdateVendor
        },
        {
          type: 'delete',
          onPrimaryAction: onDeleteVendor,
        },
      ],
  }));

  const onSyncAltText = useCallback(() => {
    setLoadingSyncAltText(true);
    const imagesToUpdate = currentVendor.colors?.map((vendorColor) => ({
      altText: vendorColor.altText,
      shopImageIds: vendorColor.shopImageIds
    })).filter((image) => !!image.shopImageIds);

    submit({
      actionType: Action.SyncAltText,
      imagesToUpdate: JSON.stringify(imagesToUpdate ?? [])
    }, { method: "PUT" });

    setTimeout(() => setLoadingSyncAltText(false), 3000);
  }, [currentVendor.colors, submit]);

  const handleVendorChange = useCallback((index: number) => {
    history.replaceState(null, "", `?vendorName=${vendors[index].name}`);
    setSelected(index);
  }, []);

  /* IMPORT VENDOR COLOR CSV */

  useEffect(() => {
    if (loadingImport.active && loadingImport.progress >= 100) {
      const remainingPendingVendorColors = pendingVendorColorsBulk.filter((vendorColor) => !vendorColor.upserted);

      if (remainingPendingVendorColors.length) {
        onUpsertManyVendorColor(remainingPendingVendorColors.map((vendorColor) => ({
            vendorName: vendorColor.data.vendorName,
            color: vendorColor.data.color,
            fiber: vendorColor.data.fiber,
            vendorColorUpdate: {
              altText: vendorColor.data.altText,
              groups: vendorColor.data.groups ? vendorColor.data.groups.split(';') : [],
              colorName: vendorColor.data.colorName,
              colorDesc: vendorColor.data.colorDesc,
              temp: vendorColor.data.temp?.toLocaleLowerCase(),
              rooted: vendorColor.data.rooted === "true" ? true : false,
              highlighted: vendorColor.data.highlighted === "true" ? true : false,
              features: vendorColor.data.features ? vendorColor.data.features.split(';') : [],
              truColorSrc: vendorColor.data.truColorSrc
            }
          })
        ));

        setVendorColorsFailed(remainingPendingVendorColors.map((vendorColor) => vendorColor.data.color).join(', '));
      }

      setLoadingImport({active: false, progress: 0, total: 0});
      setPendingVendorColorsBulk([]);
    }
  }, [loadingImport]);

  useEffect(() => {
    const validPendingVendorColorsBulk = pendingVendorColorsBulk.filter((vendorColor) => !vendorColor.upserted);

    if (actionData?.images && validPendingVendorColorsBulk.length) {
      const imagesImported = JSON.parse(actionData.images);
      const vendorColorsUpsert = [];

      for (const imageImport of imagesImported) {
        let vendorColor = validPendingVendorColorsBulk.find((vendorColor) => imageImport.imageSrc.includes(vendorColor.data.fileName));

        if (vendorColor) {
          vendorColorsUpsert.push({
            vendorName: vendorColor.data.vendorName,
            color: vendorColor.data.color,
            fiber: vendorColor.data.fiber,
            vendorColorUpdate: {
              imageSrc: imageImport.imageSrc,
              fileName: vendorColor.data.fileName,
              shopImageIds: {[actionData.shop]: imageImport.imageId},
              altText: imageImport.altText,
              groups: vendorColor.data.groups ? vendorColor.data.groups.split(';') : [],
              colorName: vendorColor.data.colorName,
              colorDesc: vendorColor.data.colorDesc,
              temp: vendorColor.data.temp?.toLocaleLowerCase(),
              rooted: vendorColor.data.rooted === "true" ? true : false,
              highlighted: vendorColor.data.highlighted === "true" ? true : false,
              features: vendorColor.data.features ? vendorColor.data.features.split(';') : [],
              truColorSrc: vendorColor.data.truColorSrc
            }
          });

          vendorColor.upserted = true
        }
      }

      if (vendorColorsUpsert.length) {
        onUpsertManyVendorColor(vendorColorsUpsert);
      }

      setLoadingImport((prev) => ({...prev, progress: Math.ceil(prev.progress + ((1 / prev.total) * 100 * actionData.failedImages))}));
    }
  }, [actionData, pendingVendorColorsBulk]);

  const submitPendingVendorColorsBulk = useCallback(async (vendorColorsBulkPayload: {
    upserted: boolean;
    data: VendorColorType & {
        imageSrc: string;
        fileName: string;
    };
  }[]) => {
    setPendingVendorColorsBulk((prev) => prev.concat(vendorColorsBulkPayload));

    submit({
      actionType: Action.UploadColorImagesBulk,
      images: JSON.stringify(vendorColorsBulkPayload.map((vendorColor) => ({
        resourceUrl: vendorColor.data.imageSrc,
        color: vendorColor.data.color,
        altText: vendorColor.data.altText,
        fileName: vendorColor.data.fileName + (vendorColor.data.imageSrc?.match(/(\.\w+)(?=\?.+)|(\.\w+)$/g)?.[0] ?? '.jpg'),
        vendorName: vendorColor.data.vendorName,
        fiber: vendorColor.data.fiber
      })))
    }, { method: "POST" });
    await sleep(10000);
  }, [submit]);

  const handleImportVendorColorsBulk = useCallback(async (vendorColorsImport: VendorColorType[]) => {
    const vendorColorsBulk: ({upserted: boolean, data: VendorColorType & {imageSrc: string, fileName: string}})[] = [];

    const vendorColorsUpsert = [];
    
    for (const vendorColorImport of vendorColorsImport) {
      const vendor = vendors.find((vendor) => vendor.name === vendorColorImport.vendorName);
      const vendorColor = vendor?.colors?.find((vendorColor) => vendorColor.color === vendorColorImport.color && vendorColor.fiber === vendorColorImport.fiber);

      if ((importOverride || !vendorColor?.imageSrc) && vendorColorImport.imageSrc) {
        let fileName = handleize(`${vendorColorImport.vendorName}_${vendorColorImport.color}${vendorColorImport.fiber ? `_${fiberFileSuffix(vendorColorImport.fiber)}` : ''}_swatch`);

        vendorColorsBulk.push({upserted: false, data: {...vendorColorImport, imageSrc: vendorColorImport.imageSrc, fileName}});
      }
      else {
        vendorColorsUpsert.push({
          vendorName: vendorColorImport.vendorName,
          color: vendorColorImport.color,
          fiber: vendorColorImport.fiber,
          vendorColorUpdate: {
            altText: vendorColorImport.altText,
            groups: vendorColorImport.groups ? vendorColorImport.groups.split(';') : [],
            colorName: vendorColorImport.colorName,
            colorDesc: vendorColorImport.colorDesc,
            temp: vendorColorImport.temp?.toLocaleLowerCase(),
            rooted: vendorColorImport.rooted === "true" ? true : false,
            highlighted: vendorColorImport.highlighted === "true" ? true : false,
            features: vendorColorImport.features ? vendorColorImport.features.split(';') : [],
            truColorSrc: vendorColorImport.truColorSrc
          }
        });
      }

      if (vendorColorsUpsert.length === 25) {
        let manyVendorColorsUpsert = [...vendorColorsUpsert];
        vendorColorsUpsert.length = 0;

        await onUpsertManyVendorColor(manyVendorColorsUpsert);
      }

      if (vendorColorsBulk.length === 10) {
        let pendingVendorColorsBulk = [...vendorColorsBulk];
        vendorColorsBulk.length = 0;

        await submitPendingVendorColorsBulk(pendingVendorColorsBulk);
      }
    }

    if (vendorColorsUpsert.length) {
      await onUpsertManyVendorColor(vendorColorsUpsert);
    }

    if (vendorColorsBulk.length) {
      await submitPendingVendorColorsBulk([...vendorColorsBulk]);
    }
  }, [onUpsertManyVendorColor, submitPendingVendorColorsBulk]);

  const handleImportVendorColorFile = useCallback((_files: File[], acceptedFiles: File[], _rejectedFiles: File[]) => {
    const file = acceptedFiles[0];

    if (file) {
      const reader = new FileReader();

      reader.onload = (e) => {
        const content = e.target?.result as string;

        if (!content) {
          return;
        }
        
        let rows = content.split(/\r\n|\n/);
        let rowHeaders = rows[0].split(',');
        let vendorColors = [];

        for (let i = 1; i < rows.length; i = i + 1) {
          let rowData = rows[i].split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/g).reduce<{[key: string]: string}>(
            (rowObject, currentValue, currentIndex) => {
              rowObject[rowHeaders[currentIndex]] = currentValue.replaceAll(/(^")|("$)/g, '');

              return rowObject;
            }, {}
          );

          if (Object.keys(rowData).length > 1) {
            vendorColors.push(rowData);
          }
        }

        setLoadingImport({active: true, progress: 0, total: vendorColors.length});

        handleImportVendorColorsBulk(vendorColors as VendorColorType[]);
      };

      reader.readAsText(file);
    }
  }, [handleImportVendorColorsBulk]);

  return (
    <Page title="Color Groups">
      {vendorColorsFailed && (
        <Banner
          title="Failed Vendor Color Images"
          tone="critical"
          onDismiss={() => setVendorColorsFailed('')}
        >
          <Text fontWeight="bold" as="span">Colors failed:</Text> {vendorColorsFailed}
        </Banner>
      )}

      <Button
        icon={PlusIcon}
        variant="tertiary"
        ariaControls="vendor-color-import"
        onClick={() => setOpenImportVendorColor((prev) => !prev)}
      >
        Vendor Color Import
      </Button>

      <Collapsible id="vendor-color-import" open={openImportVendorColor}>
        <Box paddingBlockEnd="400">
          {loadingImport.active ? (
            <ProgressBar progress={loadingImport.progress} />
          ) : (
            <>
            <Checkbox checked={importOverride} onChange={(isChecked) => setImportOverride(isChecked)} label="Override Swatch Attributes?" />
            <DropZone onDrop={handleImportVendorColorFile} allowMultiple={false} type="file">
              <DropZone.FileUpload actionHint="Formatted CSV File" />
            </DropZone>
            </>
          )}
        </Box>
      </Collapsible>

      <Card>
        <Tabs
          tabs={tabs}
          selected={selected ?? 0}
          onSelect={handleVendorChange}
          canCreateNewView
          onCreateNewView={onCreateVendor}
        >
          <BlockStack gap="400">
            <VendorColorForm onAddVendorColor={onAddVendorColor}  />
            <Divider />

            <TextField label="Search Color" value={searchInput} onChange={setSearchInput} autoComplete="off" clearButton onClearButtonClick={() => setSearchInput('')} />
            <Divider />

            <BlockStack gap="200">
              <Box>
                <Button
                  icon={PlusIcon}
                  variant="tertiary"
                  ariaControls="more-actions-collapsible"
                  onClick={() => setOpenMoreActions((prev) => !prev)}
                >
                  More Actions
                </Button>
              </Box>
              <Collapsible id="more-actions-collapsible" open={openMoreActions}>
                <Box paddingInlineStart="300" paddingBlockEnd="400">
                  <InlineStack blockAlign="center" gap="200">
                    <Text as="span">Sync vendor color images alt text for uploaded images (only applies to this store)</Text>
                    <Button icon={RefreshIcon} onClick={onSyncAltText} loading={loadingSyncAltText} />
                  </InlineStack>
                </Box>
              </Collapsible>
              <ColorGroupTable
                currentVendor={currentVendor}
                onDeleteVendorColor={onDeleteVendorColor}
                onUpdateVendorColor={onUpdateVendorColor}
                submit={submit}
                search={search}
                vendorColorTags={vendorColorTags}
                onCreateVendorColorTag={onCreateVendorColorTag}
                onDeleteVendorColorTag={onDeleteVendorColorTag}
              />
            </BlockStack>
          </BlockStack>
        </Tabs>
      </Card>
    </Page>
  );
}

function MultiSelectGroups({ selectedGroups, onChangeSelectedGroups, hideSelect = false, labelHidden = false }: {
  selectedGroups: string[],
  onChangeSelectedGroups: (values: string[]) => void,
  hideSelect: boolean,
  labelHidden?: boolean
}) {
  const [options, setOptions] = useState(COLOR_GROUPS);
  const [inputValue, setInputValue] = useState('');

  const verticalContentMarkup = useMemo(() => selectedGroups.length > 0 ? (
      <InlineStack gap="200">
        {selectedGroups.map((tag) => (
          <Tag key={`option-${tag}`}>
            {tag}
          </Tag>
        ))}
      </InlineStack>
    ) : null
  , [selectedGroups]);

  const optionsMarkup = useMemo(() => options.map((option) => {
    const {label, value} = option;

    return (
      <Listbox.Option
        key={`${value}`}
        value={value}
        selected={selectedGroups.includes(value)}
        accessibilityLabel={label}
      >
        {label}
      </Listbox.Option>
    );
  }), [options, selectedGroups]);

  const tagsMarkup = useMemo(() => selectedGroups.map((tag) => (
    <Tag key={`option-${tag}`}>
      {tag}
    </Tag>
  )), [selectedGroups]);

  const escapeSpecialRegExCharacters = useCallback((value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), []);

  const updateText = useCallback((value: string) => {
    setInputValue(value);

    if (value === '') {
      setOptions(COLOR_GROUPS);

      return;
    }

    const filterRegex = new RegExp(escapeSpecialRegExCharacters(value), 'i');
    const resultOptions = COLOR_GROUPS.filter((option) => option.label.match(filterRegex));

    setOptions(resultOptions);
  }, [escapeSpecialRegExCharacters]);

  const updateSelection = useCallback((selected: string) => {
    if (selectedGroups.includes(selected)) {
      onChangeSelectedGroups(selectedGroups.filter((option) => option !== selected));
    } else {
      onChangeSelectedGroups([...selectedGroups, selected]);
    }

    updateText('');
  }, [selectedGroups, updateText, onChangeSelectedGroups]);

  return (
    <BlockStack gap="200">
      {!hideSelect ? (
        <Box minWidth='164px'>
          <Combobox
            allowMultiple
            activator={
              <Combobox.TextField
                onChange={updateText}
                label="Group(s)"
                labelHidden={labelHidden}
                value={inputValue}
                placeholder="Search groups"
                autoComplete="off"
                verticalContent={verticalContentMarkup}
              />
            }
          >
            {optionsMarkup ? (
              <Listbox onSelect={updateSelection}>{optionsMarkup}</Listbox>
            ) : null}
          </Combobox>
        </Box>
      ) : (
        <InlineStack gap="200">
          {tagsMarkup}
        </InlineStack>
      )}
    </BlockStack>
  );
}

function MultiSelectVendorColorTags({ vendorColorTags, onChangeSelectedTags, selectedTags = [], hideSelect = false, labelHidden = false }: {
  vendorColorTags: VendorColorTag[],
  onChangeSelectedTags: (values: string[]) => void,
  selectedTags: string[],
  hideSelect: boolean,
  labelHidden?: boolean,
}) {
  const [vendorColorTagNames, setVendorColorTagNames] = useState(vendorColorTags.map((tag) => tag.name));

  const [options, setOptions] = useState(vendorColorTagNames);
  const [inputValue, setInputValue] = useState('');

  const verticalContentMarkup = useMemo(() => selectedTags.length > 0 ? (
      <InlineStack gap="200">
        {selectedTags.map((tag) => (
          <Tag key={`option-${tag}`}>
            {tag}
          </Tag>
        ))}
      </InlineStack>
    ) : null
  , [selectedTags]);

  const optionsMarkup = useMemo(() => options.map((option) => {
    return (
      <Listbox.Option
        key={option}
        value={option}
        selected={selectedTags.includes(option)}
        accessibilityLabel={option}
      >
        {option}
      </Listbox.Option>
    );
  }), [options, selectedTags]);

  const tagsMarkup = useMemo(() => selectedTags.map((tag) => (
    <Tag key={`option-${tag}`}>
      {tag}
    </Tag>
  )), [selectedTags, options]);

  const escapeSpecialRegExCharacters = useCallback((value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), []);

  const updateText = useCallback((value: string) => {
    setInputValue(value);

    if (value === '') {
      setOptions(vendorColorTagNames);

      return;
    }

    const filterRegex = new RegExp(escapeSpecialRegExCharacters(value), 'i');
    const resultOptions = vendorColorTagNames.filter((option) => option.match(filterRegex));

    setOptions(resultOptions);
  }, [escapeSpecialRegExCharacters, vendorColorTagNames]);

  const updateSelection = useCallback((selected: string) => {
    if (selectedTags.includes(selected)) {
      onChangeSelectedTags(selectedTags.filter((option) => option !== selected));
    } else {
      onChangeSelectedTags([...selectedTags, selected]);
    }

    updateText('');

    if (!vendorColorTagNames.includes(selected)) {
      setOptions((prev) => ([...prev, selected]));
      setVendorColorTagNames((prev) => ([...prev, selected]));
    }
  }, [selectedTags, updateText, onChangeSelectedTags, vendorColorTagNames]);

  return (
    <BlockStack gap="200">
      {!hideSelect ? (
        <Box minWidth='164px'>
          <Combobox
            allowMultiple
            activator={
              <Combobox.TextField
                onChange={updateText}
                label="Feature(s)"
                labelHidden={labelHidden}
                value={inputValue}
                placeholder="Search features"
                autoComplete="off"
                verticalContent={verticalContentMarkup}
              />
            }
          >
            <>
              {optionsMarkup ? (
                <Listbox onSelect={updateSelection}>
                  {inputValue && options.length === 0 && (
                    <Listbox.Action value={inputValue}>
                      Add "{inputValue}"
                    </Listbox.Action>
                  )}
                  {optionsMarkup}
                </Listbox>
              ) : null}
            </>
          </Combobox>
        </Box>
      ) : (
        <InlineStack gap="200">
          {tagsMarkup}
        </InlineStack>
      )}
    </BlockStack>
  );
}

function VendorColorForm({ onAddVendorColor }: { onAddVendorColor: (color: string, groups: string[], fiber: string) => Promise<boolean> }) {
  const [color, setColor] = useState('');
  const [groups, setGroups] = useState<string[]>([]);
  const [fiber, setFiber] = useState<string>('');
  const [showError, setShowError] = useState(false);

  const handleAddColorGroup = useCallback(() => {
    const responseSuccess = onAddVendorColor(color, groups, fiber);

    responseSuccess.then((success) => {
      if (!success) {
        setShowError(true);
      }
      else if (showError) {
        setShowError(false);
      }
    });

    setColor('');
    setGroups([]);
  }, [color, groups, onAddVendorColor, showError]);

  const handleColorChange = useCallback((value: string) => setColor(value), []);
  const handleFiberChange = useCallback((value: string) => setFiber(value), []);

  const onChangeSelectedGroups = useCallback((values: string[]) => setGroups(values), []);

  return (
    <BlockStack gap="200">
      <InlineGrid gap="400" columns={3}>
        <TextField
          value={color}
          onChange={handleColorChange}
          label="Color"
          type="text"
          autoComplete="off"
          id="vendorColor"
        />
        <Select
          label="Fiber"
          options={FIBERS}
          onChange={handleFiberChange}
          value={fiber}
        />
        <MultiSelectGroups selectedGroups={groups} onChangeSelectedGroups={onChangeSelectedGroups} hideSelect={false} />
      </InlineGrid>
      <InlineStack gap="400" blockAlign="center">
        <Button onClick={handleAddColorGroup} size="slim" disabled={!color || !groups.length} variant="primary">Add Vendor Color</Button>
        {showError && <InlineError message="Color Already Exists" fieldID="vendorColor" />}
      </InlineStack>
    </BlockStack>
  );
}

function ColorGroupTable({currentVendor, onDeleteVendorColor, onUpdateVendorColor, submit, search, vendorColorTags, onCreateVendorColorTag}: {
  currentVendor: Vendor,
  onDeleteVendorColor: (color: string, fiber: string) => () => void,
  onUpdateVendorColor: (color: string, fiber: string, vendorColorUpdate: VendorColorUpdate) => Promise<void>,
  submit: SubmitFunction,
  search: string,
  vendorColorTags: VendorColorTag[],
  onCreateVendorColorTag: (tagName: string) => void,
  onDeleteVendorColorTag: (tagName: string) => () => void
}) {
  const actionData = useActionData<any>();
  const [colorFiles, setColorFiles] = useState<{[key: string]: {
    file: File,
    fileName: string
  }}>({});
  const [editing, setEditing] = useState<{[key: string]: {
    color: string,
    groups: string[],
    altText?: string,
    fiber: string,
    colorName?: string,
    colorDesc?: string,
    temp?: string,
    rooted?: boolean,
    highlighted?: boolean,
    features: string[],
    truColorSrc?: string
  }}>({});

  /* UPDATING VENDOR COLOR */

  const getVendorColorKey = (color: string, fiber: string) => fiber ? `${color}#${fiber}` : color;

  const handleEditChange = useCallback((color: string, fiber: string, key: vendorColorProperties) => (value: string | string[] | boolean) => setEditing((prev) => {
    const colorKey = getVendorColorKey(color, fiber);

    return ({
      ...prev,
      [colorKey]: {
        ...prev[colorKey],
        [key]: value
      }
    })
  }), [setEditing]);

  const handleClearImage = useCallback((color: string, fiber: string) => () => {
    onUpdateVendorColor(color, fiber, {
      shopImageIds: {},
      imageSrc: ""
    });

    // Forces row update
    setEditing((prev) => ({...prev}));
  }, [onUpdateVendorColor]);

  const onEdit = useCallback((vendorColor: VendorColor) => () => setEditing((prev) => ({...prev, [getVendorColorKey(vendorColor.color, vendorColor.fiber)]: {
    color: vendorColor.color,
    groups: vendorColor.groups,
    altText: vendorColor.altText,
    fiber: vendorColor.fiber,
    colorName: vendorColor.colorName,
    truColorSrc: vendorColor.truColorSrc,
    colorDesc: vendorColor.colorDesc,
    temp: vendorColor.temp,
    rooted: vendorColor.rooted,
    highlighted: vendorColor.highlighted,
    features: vendorColor.features,
  }})), [setEditing]);

  const onCancelEdit = useCallback((color: string, fiber: string) => () => {
    const colorKey = getVendorColorKey(color, fiber);

    if (editing[colorKey]) {
      delete editing[colorKey];
      setEditing((prev) => ({...prev}));
    }
  }, [editing, setEditing]);

  const onSaveEdit = useCallback((color: string, fiber: string) => () => {
    const colorKey = getVendorColorKey(color, fiber);
    const editingVendorColor = editing[colorKey];

    if (editingVendorColor) {
      onUpdateVendorColor(color, fiber, {
        color: editingVendorColor.color,
        groups: [...editingVendorColor.groups],
        altText: editingVendorColor.altText,
        fiber: editingVendorColor.fiber,
        colorName: editingVendorColor.colorName,
        truColorSrc: editingVendorColor.truColorSrc,
        colorDesc: editingVendorColor.colorDesc,
        temp: editingVendorColor.temp,
        rooted: editingVendorColor.rooted,
        highlighted: editingVendorColor.highlighted,
        features: editingVendorColor.features
      });

      delete editing[colorKey];
      setEditing((prev) => ({...prev}));
    }
  }, [editing, setEditing, onUpdateVendorColor]);

  /* UPDATING VENDOR COLOR: IMAGE FUNCTIONALITY */

  const handleUploadImage = useCallback(async (stagedTarget: any, color: string, fiber: string, altText: string) => {
    const colorFile = colorFiles[getVendorColorKey(color, fiber)];
    
    if (!colorFile) {
      return;
    }

    const params = stagedTarget.parameters; // Parameters contain all the sensitive info we'll need to interact with the aws bucket.
    const url = stagedTarget.url; // This is the url you'll use to post data to aws. It's a generic s3 url that when combined with the params sends your data to the right place.
    const resourceUrl = stagedTarget.resourceUrl;

    const formData = new FormData();

    params.forEach(({ name, value }: {name: any, value: any}) => {
      formData.append(name, value);
    });

    formData.append("file", colorFile.file);

    await fetch(url, {
      method: "post",
      body: formData
    });

    submit({
      actionType: Action.UploadColorImage,
      resourceUrl,
      color,
      altText,
      fiber
    }, { method: "POST" });
  }, [colorFiles, submit]);

  useEffect(() => {
    const colorKey = actionData && actionData.imageSrc && actionData.color ? getVendorColorKey(actionData.color, actionData.fiber) : undefined;

    if (actionData?.stagedTarget) {
      handleUploadImage(actionData.stagedTarget, actionData.color, actionData.fiber, actionData.altText);
    }
    else if (colorKey && colorFiles[colorKey]) {
      onUpdateVendorColor(actionData.color, actionData.fiber, {
        imageSrc: actionData.imageSrc,
        fileName: colorFiles[colorKey].fileName,
        shopImageIds: {[actionData.shop]: actionData.imageId},
        altText: actionData.altText
      });

      delete colorFiles[colorKey];
      setColorFiles((prev) => ({...prev}));
    }
  }, [actionData]);

  const handleDropZoneDrop = useCallback((color: string, fiber: string, altText: string | undefined) => async (_dropFiles: File[], acceptedFiles: File[], _rejectedFiles: File[]) => {
    const acceptedFile = acceptedFiles[0];
    const fileName = handleize(`${currentVendor.name}_${color}${fiber ? `_${fiberFileSuffix(fiber)}` : ''}_swatch`);
    const colorKey = getVendorColorKey(color, fiber);

    setColorFiles((prev) => ({...prev, [colorKey]: { file: acceptedFile, fileName }}));

    submit({
      actionType: Action.StageColorImage,
      color,
      altText: altText ?? "",
      file: JSON.stringify({ filename: fileName, mimeType: acceptedFile.type, fileSize: acceptedFile.size.toString()}),
      fiber
    }, { method: "POST" });
  }, [currentVendor.name, setColorFiles, submit]);

  const rows = useMemo(() => {
    const selectedVendorColors = currentVendor.colors?.filter((color) => color.color.toLocaleLowerCase().includes(search.toLocaleLowerCase()));

    if (selectedVendorColors && Object.keys(selectedVendorColors).length) {
      return selectedVendorColors.map((vendorColor, index) => {
        const colorKey = getVendorColorKey(vendorColor.color, vendorColor.fiber);

        return (
          <IndexTable.Row
            id={colorKey}
            key={colorKey}
            position={index}
          >
            <td style={{width: 0}} className="Polaris-IndexTable__TableCell">
              <Box width="60px">
                <DropZone onDrop={handleDropZoneDrop(vendorColor.color, vendorColor.fiber, vendorColor.altText)} allowMultiple={false} accept="image/png, image/jpeg, .webp">
                  {colorFiles[colorKey] ? <Box paddingInline="500" paddingBlockStart="200"><Spinner accessibilityLabel="Loading Image" size="small" /></Box> : (
                    vendorColor.imageSrc ? (
                      <Thumbnail
                        size="medium"
                        alt={`${vendorColor.color} Color Image`}
                        source={vendorColor.imageSrc}
                      />
                    ) : <DropZone.FileUpload />
                  )}
                </DropZone>
              </Box>

              {vendorColor.imageSrc && editing[colorKey] && (
                <span style={{margin: "0 12px"}}>
                  <Button
                    accessibilityLabel="Clear Image"
                    variant="plain"
                    tone="critical"
                    textAlign="center"
                    onClick={handleClearImage(vendorColor.color, vendorColor.fiber)}
                    fullWidth
                  >
                    Clear
                  </Button>
                </span>
              )}
            </td>

            <IndexTable.Cell>
              {editing[colorKey] ? (
                <Box>
                  <TextField
                    label="Color Code"
                    labelHidden
                    value={editing[colorKey].color}
                    onChange={handleEditChange(vendorColor.color, vendorColor.fiber, 'color')}
                    autoComplete="off"
                  />
                </Box>
              ) : (
                <BlockStack>
                  <Text variant="bodyMd" fontWeight="bold" as="span">
                    {vendorColor.color}
                  </Text>
                </BlockStack>
              )}
            </IndexTable.Cell>

            <IndexTable.Cell>
              {editing[colorKey] ? (
                <Box>
                  <TextField
                    label="Color Name"
                    labelHidden
                    value={editing[colorKey].colorName}
                    onChange={handleEditChange(vendorColor.color, vendorColor.fiber, 'colorName')}
                    autoComplete="off"
                  />
                </Box>
              ) : (
                <BlockStack>
                  <Text variant="bodyMd" fontWeight="bold" as="span">
                    {vendorColor.colorName}
                  </Text>
                </BlockStack>
              )}
            </IndexTable.Cell>

            <IndexTable.Cell>
              {editing[colorKey] ? (
                <Box>
                  <Select
                    label="Fiber"
                    options={FIBERS}
                    labelHidden
                    value={editing[colorKey].fiber}
                    onChange={handleEditChange(vendorColor.color, vendorColor.fiber, 'fiber')}
                  />
                </Box>
              ) : (
                <BlockStack>
                  <Text variant="bodyMd" as="span">
                    {vendorColor.fiber}
                  </Text>
                </BlockStack>
              )}
            </IndexTable.Cell>

            <IndexTable.Cell>
              <MultiSelectGroups
                selectedGroups={editing[colorKey] ? editing[colorKey].groups : vendorColor.groups}
                onChangeSelectedGroups={handleEditChange(vendorColor.color, vendorColor.fiber, 'groups')}
                hideSelect={!editing[colorKey]}
                labelHidden={true}
              />
            </IndexTable.Cell>

            <IndexTable.Cell>
              {editing[colorKey] ? (
                <Box>
                  <Select
                    label="Temperature"
                    labelHidden
                    options={TEMPERATURES}
                    onChange={handleEditChange(vendorColor.color, vendorColor.fiber, 'temp')}
                    value={editing[colorKey].temp}
                    placeholder=""
                  />
                </Box>
              ) : (
                <BlockStack>
                  <Text variant="bodyMd" as="span">
                    {vendorColor.temp}
                  </Text>
                </BlockStack>        
              )}
            </IndexTable.Cell>

            <IndexTable.Cell>
              {editing[colorKey] ? (
                <InlineStack align="center">
                  <Checkbox
                    label="Rooted"
                    labelHidden
                    onChange={handleEditChange(vendorColor.color, vendorColor.fiber, 'rooted')}
                    checked={editing[colorKey].rooted}
                  />
                </InlineStack>
              ) : (
                <BlockStack>
                  {vendorColor.rooted ? <Icon source={CheckIcon} tone="success" /> : <Icon source={XIcon} tone="subdued" />}
                </BlockStack>
              )}
            </IndexTable.Cell>

            <IndexTable.Cell>
              {editing[colorKey] ? (
                <InlineStack align="center">
                  <Checkbox
                    label="Highlighted"
                    labelHidden
                    onChange={handleEditChange(vendorColor.color, vendorColor.fiber, 'highlighted')}
                    checked={editing[colorKey].highlighted}
                  />
                </InlineStack>
              ) : (
                <BlockStack>
                  {vendorColor.highlighted ? <Icon source={CheckIcon} tone="success" /> : <Icon source={XIcon} tone="subdued" />}
                </BlockStack>
              )}
            </IndexTable.Cell>

            <IndexTable.Cell>
              {editing[colorKey] ? (
                <TextField
                  label="Alt Text"
                  labelHidden
                  value={editing[colorKey].altText}
                  onChange={handleEditChange(vendorColor.color, vendorColor.fiber, 'altText')}
                  maxLength={512}
                  autoComplete="off"
                  multiline
                />
              ) : (
                <Text variant="bodyMd" as="span">
                  {vendorColor.altText}
                </Text>
              )}
            </IndexTable.Cell>

            <IndexTable.Cell>
              {editing[colorKey] ? (
                <TextField
                  label="Description"
                  labelHidden
                  value={editing[colorKey].colorDesc}
                  onChange={handleEditChange(vendorColor.color, vendorColor.fiber, 'colorDesc')}
                  maxLength={512}
                  autoComplete="off"
                  multiline
                />
              ) : (
                <Text variant="bodyMd" as="span">
                  {vendorColor.colorDesc}
                </Text>
              )}
            </IndexTable.Cell>

            <IndexTable.Cell>
              <MultiSelectVendorColorTags
                vendorColorTags={vendorColorTags}
                onChangeSelectedTags={handleEditChange(vendorColor.color, vendorColor.fiber, 'features')}
                selectedTags={editing[colorKey] ? editing[colorKey].features : vendorColor.features}
                hideSelect={!editing[colorKey]}
                labelHidden={true}
              />
            </IndexTable.Cell>

            <td style={{width: 0}} className="Polaris-IndexTable__TableCell">
              <InlineStack align="center">
                <Button icon={DeleteIcon} accessibilityLabel="Delete Color Group" onClick={onDeleteVendorColor(vendorColor.color, vendorColor.fiber)} variant="primary" tone="critical" />
              </InlineStack>
            </td>

            <td className="Polaris-IndexTable__TableCell">
              <Box minWidth={!editing[colorKey] ? "32px" : "120px"}>
              <InlineStack align="center">
                {editing[colorKey] ? (
                  <InlineGrid gap="100" columns={2} alignItems="center">
                    <Button icon={XIcon} accessibilityLabel="Cancel Color Group Edit" onClick={onCancelEdit(vendorColor.color, vendorColor.fiber)} /><Text as="span">Cancel</Text>
                    <Button icon={CheckIcon} accessibilityLabel="Save Color Group Edit" onClick={onSaveEdit(vendorColor.color, vendorColor.fiber)} /><Text as="span">Save</Text>
                  </InlineGrid>
                ) : (
                  <Button icon={EditIcon} accessibilityLabel="Edit Color Group" onClick={onEdit(vendorColor)} />
                )}
              </InlineStack>
              </Box>
            </td>
          </IndexTable.Row>
      )});
    }
    else {
      return null;
    }
  }, [currentVendor.colors, colorFiles, editing, handleEditChange, handleDropZoneDrop, onCancelEdit, onDeleteVendorColor, onEdit, onSaveEdit, search]);

  const emptyStateMarkup = (
    <EmptySearchResult
      title={'No Vendor Colors'}
      withIllustration
    />
  );

  return (
    <Card padding="0">
      <IndexTable
        itemCount={rows?.length ?? 0}
        selectable={false}
        headings={[
            {title: 'Image', alignment: 'center'},
            {title: 'Color Code'},
            {title: 'Color Name'},
            {title: 'Fiber'},
            {title: 'Group(s)'},
            {title: 'Temperature'},
            {title: 'Rooted'},
            {title: 'Highlighted'},
            {title: 'Alt Text'},
            {title: 'Description'},
            {title: 'Features'},
            {title: 'Remove', alignment: 'center'},
            {title: 'Edit', alignment: 'center'}
          ]}
        emptyState={emptyStateMarkup}
        lastColumnSticky
      >
        {rows}
      </IndexTable>
    </Card>
  );
};
