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
  Banner
} from '@shopify/polaris';
import { CheckIcon, DeleteIcon, EditIcon, PlusIcon, RefreshIcon, SearchIcon, XIcon } from '@shopify/polaris-icons';
import { useState, useCallback, useMemo, useEffect } from 'react';
import type {
  SubmitFunction} from "@remix-run/react";
import {
  useActionData,
  useLoaderData,
  useSubmit
} from "@remix-run/react";

import type {
  Vendor} from "../models/Vendor.server";
import {
  getVendors,
  createVendor,
  updateVendor,
  deleteVendor
} from "../models/Vendor.server";

import type {
  VendorColor,
  VendorColorUpdate} from "../models/VendorColor.server";
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

import { authenticate } from 'app/shopify.server';
import { handleize } from 'app/utils';

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
  SyncAltText = "SyncAltText"
}

const COLOR_GROUPS = [
  {value: 'brunettes', label: 'Brunettes'},
  {value: 'blondes', label: 'Blondes'},
  {value: 'blacks', label: 'Blacks'},
  {value: 'grays', label: 'Grays'},
  {value: 'reds', label: 'Reds'},
  {value: 'new_colors', label: 'New Colors'},
  {value: 'best_sellers', label: 'Best Sellers'},
  {value: 'fashion-color', label: 'Fashion Color'},
  {value: 'exclusive-color', label: 'Exclusive Color'},
];

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

type VendorColorType = {
  color: string,
  vendorName: string,
  imageSrc?: string,
  altText?: string,
  groups?: string
}

export async function loader() {
  return Response.json(await getVendors());
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
      return await createVendorColor(data.vendorName, data.color, JSON.parse(data.groups));
    case Action.UpdateVendorColor:
      return await updateVendorColor(data.vendorName, data.color, JSON.parse(data.vendorColorUpdate));
    case Action.UpsertVendorColor:
      return await upsertVendorColor(data.vendorName, data.color, JSON.parse(data.vendorColorUpdate));
    case Action.UpsertManyVendorColor:
      return await upsertManyVendorColor(JSON.parse(data.vendorColors));
    case Action.DeleteVendorColor:
      return await deleteVendorColor(data.vendorName, data.color);
    case Action.StageColorImage:
      const stagedTargetResponse = await stageColorImage(admin.graphql, JSON.parse(data.file));

      return ({...stagedTargetResponse, color: data.color, altText: data.altText});
    case Action.UploadColorImage:
      return await uploadColorImage(admin.graphql, data.resourceUrl, data.color, data.altText, shop, data.vendorName, data.fileName);
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
  }

  return Response.json({ errors: ['Invalid data passed.'] }, { status: 422 });
}

export default function ColorGroups() {
  const submit = useSubmit();

  const [vendors, setVendors] = useState<Vendor[]>(useLoaderData<Vendor[]>() ?? []);
  const [selected, setSelected] = useState(0);
  const [openMoreActions, setOpenMoreActions] = useState(false);
  const [loadingSyncAltText, setLoadingSyncAltText] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const [openImportVendorColor, setOpenImportVendorColor] = useState(false);
  const [loadingImport, setLoadingImport] = useState<{active: boolean, progress: number, total: number}>({active: false, progress: 0, total: 0});
  const [pendingVendorColorsBulk, setPendingVendorColorsBulk] = useState<{
    upserted: boolean,
    data: {
      altText?: string,
      imageSrc: string,
      color: string,
      vendorName: string,
      fileName?: string,
      groups?: string
    }
  }[]>([]);
  const [vendorColorsFailed, setVendorColorsFailed] = useState('');
  const actionData = useActionData<any>();

  const vendorTabs = useMemo(() => vendors?.length ? vendors.map((vendor) => vendor.name) : [], [vendors]);
  const currentVendor = useMemo(() => vendors[selected], [vendors, selected]);

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const submitSearch = useDebounce(setSearch);

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

  /* MUTATE VENDOR COLORS */

  const onAddVendorColor = useCallback(async (color: string, groups: string[]) => {
    if (currentVendor.colors?.find((vendorColor) => vendorColor.color === color)) {
      return false;
    }

    const colorData = {
      vendorName: currentVendor.name,
      color,
      groups,
      shopImageIds: {}
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
      groups: JSON.stringify(groups)
    }, { method: "POST" });

    setVendors((prev) => [...prev]);

    return true;
  }, [currentVendor, submit]);

  const onUpdateVendorColor = useCallback(async (color: string, vendorColorUpdate: VendorColorUpdate) => {
    const vendorColor = currentVendor.colors?.find((vendorColor) => vendorColor.color === color);

    if (vendorColor) {
      vendorColor.color = vendorColorUpdate.color ?? vendorColor.color;
      vendorColor.groups = vendorColorUpdate.groups ?? vendorColor.groups;
      vendorColor.imageSrc = vendorColorUpdate.imageSrc ?? vendorColor.imageSrc;
      vendorColor.shopImageIds = vendorColorUpdate.shopImageIds ?? vendorColor.shopImageIds;
      vendorColor.altText = vendorColorUpdate.altText ?? vendorColor.altText;
      vendorColor.fileName = vendorColorUpdate.fileName ?? vendorColor.fileName;
    }
    else {
      return;
    }

    await sleep(1);
    submit({
      actionType: Action.UpdateVendorColor,
      vendorName: currentVendor.name,
      color,
      vendorColorUpdate: JSON.stringify(vendorColorUpdate)
    }, { method: "PUT" });

    setVendors((prev) => [...prev]);
  }, [currentVendor, submit]);

  const onUpsertVendorColor = useCallback(async (vendorName: string, color: string, vendorColorUpdate: VendorColorUpdate) => {
    const vendor = vendors.find((vendor) => vendor.name === vendorName);
    const vendorColor = vendor?.colors?.find((vendorColor) => vendorColor.color === color);

    if (vendorColor) {
      vendorColor.color = vendorColorUpdate.color ?? vendorColor.color;
      vendorColor.groups = vendorColorUpdate.groups ?? vendorColor.groups;
      vendorColor.imageSrc = vendorColorUpdate.imageSrc ?? vendorColor.imageSrc;
      vendorColor.altText = vendorColorUpdate.altText ?? vendorColor.altText;
      vendorColor.fileName = vendorColorUpdate.fileName ?? vendorColor.fileName;

      if (vendor?.colors) {
        vendor.colors = [...vendor.colors];
      }
    }
    else if (vendor) {
      const colorData = {
        vendorName: vendorName,
        color: color,
        groups: vendorColorUpdate.groups ?? [],
        shopImageIds: {},
        imageSrc: vendorColorUpdate.imageSrc ?? undefined,
        altText: vendorColorUpdate.altText
      };

      if (vendor.colors) {
        vendor.colors = [...vendor.colors, {...colorData}];
      }
      else {
        vendor.colors = [{...colorData}];
      }
    }

    setLoadingImport((prev) => ({...prev, progress: Math.ceil(prev.progress + ((1 / prev.total) * 100))}));

    await sleep(1);
    submit({
      actionType: Action.UpsertVendorColor,
      vendorName: vendorName,
      color,
      vendorColorUpdate: JSON.stringify(vendorColorUpdate)
    }, { method: "PUT" });

    setVendors((prev) => [...prev]);
  }, [vendors, submit]);

  const onUpsertManyVendorColor = useCallback(async (vendorColorsUpsert: {vendorName: string, color: string, vendorColorUpdate: VendorColorUpdate}[]) => {
    for (const vendorColorUpsert of vendorColorsUpsert) {
      const vendor = vendors.find((vendor) => vendor.name === vendorColorUpsert.vendorName);
      const vendorColor = vendor?.colors?.find((vendorColor) => vendorColor.color === vendorColorUpsert.color);

      if (vendorColor) {
        vendorColor.color = vendorColorUpsert.vendorColorUpdate.color ?? vendorColor.color;
        vendorColor.groups = vendorColorUpsert.vendorColorUpdate.groups ?? vendorColor.groups;
        vendorColor.imageSrc = vendorColorUpsert.vendorColorUpdate.imageSrc ?? vendorColor.imageSrc;
        vendorColor.altText = vendorColorUpsert.vendorColorUpdate.altText ?? vendorColor.altText;
        vendorColor.fileName = vendorColorUpsert.vendorColorUpdate.fileName ?? vendorColor.fileName;

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
          altText: vendorColorUpsert.vendorColorUpdate.altText
        };

        if (vendor.colors) {
          vendor.colors = [...vendor.colors, {...colorData}];
        }
        else {
          vendor.colors = [{...colorData}];
        }
      }

      setLoadingImport((prev) => ({...prev, progress: Math.ceil(prev.progress + ((1 / prev.total) * 100))}));
    }

    await sleep(1000);
    submit({
      actionType: Action.UpsertManyVendorColor,
      vendorColors: JSON.stringify(vendorColorsUpsert)
    }, { method: "PUT" });

    setVendors((prev) => [...prev]);
  }, [vendors, submit]);

  const onDeleteVendorColor = useCallback((color: string) => async () => {
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
      color
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

  /* IMPORT VENDOR COLOR CSV */

  useEffect(() => {
    if (loadingImport.active && loadingImport.progress >= 100) {
      const remainingPendingVendorColors = pendingVendorColorsBulk.filter((vendorColor) => !vendorColor.upserted);

      if (remainingPendingVendorColors.length) {
        onUpsertManyVendorColor(remainingPendingVendorColors.map((vendorColor) => ({
            vendorName: vendorColor.data.vendorName,
            color: vendorColor.data.color, 
            vendorColorUpdate: {
              altText: vendorColor.data.altText,
              groups: vendorColor.data.groups ? vendorColor.data.groups.split(';') : []
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

      setLoadingImport((prev) => ({...prev, progress: Math.ceil(prev.progress + ((1 / prev.total) * 100 * actionData.failedImages))}));

      for (const imageImport of imagesImported) {
        let vendorColor = validPendingVendorColorsBulk.find((vendorColor) => imageImport.imageSrc.includes(vendorColor.data.fileName));

        if (vendorColor) {
          vendorColorsUpsert.push({
            vendorName: vendorColor.data.vendorName,
            color: vendorColor.data.color, 
            vendorColorUpdate: {
              imageSrc: imageImport.imageSrc,
              fileName: vendorColor.data.fileName,
              shopImageIds: {[actionData.shop]: imageImport.imageId},
              altText: imageImport.altText,
              groups: vendorColor.data.groups ? vendorColor.data.groups.split(';') : []
            }
          });

          vendorColor.upserted = true
        }
      }

      if (vendorColorsUpsert.length) {
        onUpsertManyVendorColor(vendorColorsUpsert);
      }
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
        vendorName: vendorColor.data.vendorName
      })))
    }, { method: "POST" });
  }, [submit]);

  const handleImportVendorColorsBulk = useCallback(async (vendorColors: VendorColorType[]) => {
    const vendorColorsBulk: ({upserted: boolean, data: VendorColorType & {imageSrc: string, fileName: string}})[] = [];
    
    for (const vendorColor of vendorColors) {
      if (vendorColor.imageSrc) {
        let fileName = handleize(`${vendorColor.vendorName}_${vendorColor.color}_swatch`);

        vendorColorsBulk.push({upserted: false, data: {...vendorColor, imageSrc: vendorColor.imageSrc, fileName}});
      }
      else {
        onUpsertVendorColor(vendorColor.vendorName, vendorColor.color, {
          altText: vendorColor.altText,
          groups: vendorColor.groups ? vendorColor.groups.split(';') : []
        });
      }

      if (vendorColorsBulk.length === 10) {
        submitPendingVendorColorsBulk([...vendorColorsBulk]);

        vendorColorsBulk.length = 0;

        await sleep(10000);
      }
    }

    if (vendorColorsBulk.length) {
      submitPendingVendorColorsBulk([...vendorColorsBulk]);
    }
  }, [onUpsertVendorColor, submitPendingVendorColorsBulk]);

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
          let rowData = rows[i].split(',').reduce<{[key: string]: string}>(
            (rowObject, currentValue, currentIndex) => {
              rowObject[rowHeaders[currentIndex]] = currentValue;

              return rowObject;
            }, {}
          );

          vendorColors.push(rowData);
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
            <DropZone onDrop={handleImportVendorColorFile} allowMultiple={false} type="file">
              <DropZone.FileUpload actionHint="Formatted CSV File" />
            </DropZone>
          )}
        </Box>
      </Collapsible>

      <Card>
        <Tabs
          tabs={tabs}
          selected={selected}
          onSelect={setSelected}
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
              />
            </BlockStack>
          </BlockStack>
        </Tabs>
      </Card>
    </Page>
  );
}

function MultiSelectGroups({ selectedGroups, onChangeSelectedGroups, hideSelect = false }: {
  selectedGroups: string[],
  onChangeSelectedGroups: (values: string[]) => void,
  hideSelect: boolean
}) {
  const [options, setOptions] = useState(COLOR_GROUPS);
  const [inputValue, setInputValue] = useState('');

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

  const tagsMarkup = useMemo(() => selectedGroups.map((group) => (
    <Tag key={`option-${group}`}>
      {group}
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
      {!hideSelect && (
        <Combobox
          allowMultiple
          activator={
            <Combobox.TextField
              prefix={<Icon source={SearchIcon}/>}
              onChange={updateText}
              label="Group(s)"
              value={inputValue}
              placeholder="Search groups"
              autoComplete="off"
            />
          }
        >
          {optionsMarkup ? (
            <Listbox onSelect={updateSelection}>{optionsMarkup}</Listbox>
          ) : null}
        </Combobox>
      )}
      <InlineStack gap="200">
        {tagsMarkup}
      </InlineStack>
    </BlockStack>
  );
}

function VendorColorForm({ onAddVendorColor }: { onAddVendorColor: (color: string, groups: string[]) => Promise<boolean> }) {
  const [color, setColor] = useState('');
  const [groups, setGroups] = useState<string[]>([]);
  const [showError, setShowError] = useState(false);

  const handleAddColorGroup = useCallback(() => {
    const responseSuccess = onAddVendorColor(color, groups);

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

  const onChangeSelectedGroups = useCallback((values: string[]) => setGroups(values), []);

  return (
    <InlineGrid gap="100" columns={2}>
      <TextField
        value={color}
        onChange={handleColorChange}
        label="Color"
        type="text"
        autoComplete="off"
        id="vendorColor"
      />
      <MultiSelectGroups selectedGroups={groups} onChangeSelectedGroups={onChangeSelectedGroups} hideSelect={false} />
      <InlineStack gap="400" blockAlign="center">
        <Button onClick={handleAddColorGroup} size="slim" disabled={!color || !groups.length} variant="primary">Add Vendor Color</Button>
        {showError && <InlineError message="Color Already Exists" fieldID="vendorColor" />}
      </InlineStack>
    </InlineGrid>
  );
}

function ColorGroupTable({currentVendor, onDeleteVendorColor, onUpdateVendorColor, submit, search}: {
  currentVendor: Vendor,
  onDeleteVendorColor: (color: string) => () => void,
  onUpdateVendorColor: (color: string, vendorColorUpdate: VendorColorUpdate) => Promise<void>,
  submit: SubmitFunction,
  search: string
}) {
  const actionData = useActionData<any>();
  const [colorFiles, setColorFiles] = useState<{[key: string]: {
    file: File,
    fileName: string
  }}>({});
  const [editing, setEditing] = useState<{[key: string]: {
    color: string,
    groups: string[],
    altText?: string
  }}>({});

  /* UPDATING VENDOR COLOR */

  const handleColorChange = useCallback((color: string) => (value: string) => setEditing((prev) => ({
    ...prev,
    [color]: {
      ...prev[color],
      color: value
    }
  })), [setEditing]);

  const handleGroupsChange = useCallback((color: string) => (values: string[]) => setEditing((prev) => ({
    ...prev,
    [color]: {
      ...prev[color],
      groups: values
    }
  })), [setEditing]);

  const handleAltTextChange = useCallback((color: string) => (value: string) => setEditing((prev) => ({
    ...prev,
    [color]: {
      ...prev[color],
      altText: value
    }
  })), [setEditing]);

  const handleClearImage = useCallback((color: string) => () => {
    onUpdateVendorColor(color, {
      shopImageIds: {},
      imageSrc: ""
    });

    // Forces row update
    setEditing((prev) => ({...prev}));
  }, [onUpdateVendorColor]);

  const onEdit = useCallback((vendorColor: VendorColor) => () => setEditing((prev) => ({...prev, [vendorColor.color]: {
    color: vendorColor.color,
    groups: vendorColor.groups,
    altText: vendorColor.altText
  }})), [setEditing]);

  const onCancelEdit = useCallback((color: string) => () => {
    if (editing[color]) {
      delete editing[color];
      setEditing((prev) => ({...prev}));
    }
  }, [editing, setEditing]);

  const onSaveEdit = useCallback((color: string) => () => {
    const editingVendorColor = editing[color];

    if (editingVendorColor) {
      onUpdateVendorColor(color, {
        color: editingVendorColor.color,
        groups: [...editingVendorColor.groups],
        altText: editingVendorColor.altText
      });

      delete editing[color];
      setEditing((prev) => ({...prev}));
    }
  }, [editing, setEditing, onUpdateVendorColor]);

  /* UPDATING VENDOR COLOR: IMAGE FUNCTIONALITY */

  const handleUploadImage = useCallback(async (stagedTarget: any, color: string, altText: string) => {
    const colorFile = colorFiles[color];
    
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
      altText
    }, { method: "POST" });
  }, [colorFiles, submit]);

  useEffect(() => {
    if (actionData?.stagedTarget) {
      handleUploadImage(actionData.stagedTarget, actionData.color, actionData.altText);
    }
    else if (actionData?.imageSrc && colorFiles[actionData.color]) {
      onUpdateVendorColor(actionData.color, {
        imageSrc: actionData.imageSrc,
        fileName: colorFiles[actionData.color].fileName,
        shopImageIds: {[actionData.shop]: actionData.imageId},
        altText: actionData.altText
      });

      delete colorFiles[actionData.color];
      setColorFiles((prev) => ({...prev}));
    }
  }, [actionData]);

  const handleDropZoneDrop = useCallback((color: string, altText: string | undefined) => async (_dropFiles: File[], acceptedFiles: File[], _rejectedFiles: File[]) => {
    const acceptedFile = acceptedFiles[0];
    const fileName = handleize(`${currentVendor.name}_${color}_swatch`);

    setColorFiles((prev) => ({...prev, [color]: { file: acceptedFile, fileName }}));

    submit({
      actionType: Action.StageColorImage,
      color,
      altText: altText ?? `${currentVendor.name} Color ${color} Swatch`,
      file: JSON.stringify({ filename: fileName, mimeType: acceptedFile.type, fileSize: acceptedFile.size.toString()})
    }, { method: "POST" });
  }, [currentVendor.name, setColorFiles, submit]);

  const rows = useMemo(() => {
    const selectedVendorColors = currentVendor.colors?.filter((color) => color.color.toLocaleLowerCase().includes(search.toLocaleLowerCase()));

    if (selectedVendorColors && Object.keys(selectedVendorColors).length) {
      return selectedVendorColors.map((vendorColor, index) => {
        return (
          <IndexTable.Row
            id={vendorColor.color}
            key={vendorColor.color}
            position={index}
          >
            <td style={{width: 0}} className="Polaris-IndexTable__TableCell">
              <Box width="60px">
                <DropZone onDrop={handleDropZoneDrop(vendorColor.color, vendorColor.altText)} allowMultiple={false} accept="image/png, image/jpeg">
                  {colorFiles[vendorColor.color] ? <Box paddingInline="500" paddingBlockStart="200"><Spinner accessibilityLabel="Loading Image" size="small" /></Box> : (
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

              {vendorColor.imageSrc && (
                <span style={{margin: "0 12px"}}>
                  <Button
                    accessibilityLabel="Clear Image"
                    variant="plain"
                    tone="critical"
                    textAlign="center"
                    onClick={handleClearImage(vendorColor.color)}
                    fullWidth
                  >
                    Clear
                  </Button>
                </span>
              )}
            </td>

            <IndexTable.Cell>
              {editing[vendorColor.color] ? (
                <TextField
                  label="Color"
                  labelHidden
                  value={editing[vendorColor.color].color}
                  onChange={handleColorChange(vendorColor.color)}
                  autoComplete="off"
                />
              ) : (
                <Text variant="bodyMd" fontWeight="bold" as="span">
                  {vendorColor.color}
                </Text>
              )}
            </IndexTable.Cell>

            <IndexTable.Cell>
              <MultiSelectGroups
                selectedGroups={editing[vendorColor.color] ? editing[vendorColor.color].groups : vendorColor.groups}
                onChangeSelectedGroups={handleGroupsChange(vendorColor.color)}
                hideSelect={!editing[vendorColor.color]}
              />
            </IndexTable.Cell>

            <IndexTable.Cell>
              {editing[vendorColor.color] ? (
                <TextField
                  label="Color"
                  labelHidden
                  value={editing[vendorColor.color].altText}
                  onChange={handleAltTextChange(vendorColor.color)}
                  autoComplete="off"
                />
              ) : (
                <Text variant="bodyMd" as="span">
                  {vendorColor.altText}
                </Text>
              )}
            </IndexTable.Cell>

            <td style={{width: 0}} className="Polaris-IndexTable__TableCell">
              <InlineStack align="center">
                <Button icon={DeleteIcon} accessibilityLabel="Delete Color Group" onClick={onDeleteVendorColor(vendorColor.color)} variant="primary" tone="critical" />
              </InlineStack>
            </td>

            <td className="Polaris-IndexTable__TableCell">
              <Box minWidth="120px">
              <InlineStack align="center">
                {editing[vendorColor.color] ? (
                  <InlineGrid gap="100" columns={2} alignItems="center">
                    <Button icon={XIcon} accessibilityLabel="Cancel Color Group Edit" onClick={onCancelEdit(vendorColor.color)} /><Text as="span">Cancel</Text>
                    <Button icon={CheckIcon} accessibilityLabel="Save Color Group Edit" onClick={onSaveEdit(vendorColor.color)} /><Text as="span">Save</Text>
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
  }, [currentVendor.colors, colorFiles, editing, handleAltTextChange, handleColorChange, handleDropZoneDrop, handleGroupsChange, onCancelEdit, onDeleteVendorColor, onEdit, onSaveEdit, search]);

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
            {title: 'Color'},
            {title: 'Group(s)'},
            {title: 'Alt Text'},
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
