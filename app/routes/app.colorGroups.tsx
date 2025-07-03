import {
  Page,
  Card, 
  Tabs,
  TabProps,
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
  Collapsible
} from '@shopify/polaris';
import { CheckIcon, DeleteIcon, EditIcon, PlusIcon, RefreshIcon, SearchIcon, XIcon } from '@shopify/polaris-icons';
import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  SubmitFunction,
  useActionData,
  useLoaderData,
  useSubmit
} from "@remix-run/react";

import {
  Vendor,
  getVendors,
  createVendor,
  updateVendor,
  deleteVendor,
  validateVendor
} from "../models/Vendor.server";

import {
  VendorColor,
  VendorColorUpdate,
  createVendorColor,
  updateVendorColor,
  deleteVendorColor,
  stageColorImage,
  uploadColorImage,
  validateVendorColor,
  createManyVendorColors
,} from "../models/VendorColor.server";

import { authenticate } from 'app/shopify.server';
import { handleize } from 'app/utils';

enum Action {
  CreateVendor = "CreateVendor",
  UpdateVendor = "UpdateVendor",
  DeleteVendor = "DeleteVendor",
  CreateVendorColor = "CreateVendorColor",
  UpdateVendorColor = "UpdateVendorColor",
  DeleteVendorColor = "DeleteVendorColor",
  StageColorImage = "StageColorImage",
  UploadColorImage = "UploadColorImage",
  SyncAltText = "SyncAltText",
  UploadVendorColorBulk = "UploadVendorColorBulk"
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
  {value: 'greys', label: 'Greys'},
];

const UPLOAD_COLORS = {
  "Amore": "{\"60\":\"grays\",\"A140/27B\":\"blondes\",\"A246\":\"blondes\",\"A30\":\"brunettes\",\"A30/8\":\"brunettes\",\"A4\":\"blacks\",\"A613/140\":\"blondes\",\"A613/27C\":\"blondes\",\"A8\":\"brunettes\",\"ALMOND-ROCKA\":\"brunettes\",\"ALMOND-ROCKA-R\":\"brunettes\",\"APRICOT-FROST\":\"reds\",\"AUBURN-SUGAR\":\"brunettes\",\"AUBURN-SUGAR-R\":\"brunettes\",\"BANANA-SPLIT-LR\":\"blondes\",\"BANANNA-SPLIT-LR\":\"blondes\",\"BLACK\":\"blacks\",\"BRONZED-BROWN\":\"brunettes\",\"BROWN-SPICE\":\"brunettes\",\"BUBBLEGUM-R\":\"fashion-color\",\"BURGUNDY\":\"reds\",\"BURGUNDY-ROSA\":\"reds\",\"BURNT-SIENNA\":\"reds\",\"BUTTER-PECAN\":\"blondes\",\"BUTTERSCOTSCH\":\"blondes\",\"CAPPUCCINO\":\"brunettes\",\"CAPPUCINO\":\"brunettes\",\"CARAMEL-BROWN\":\"brunettes\",\"CAYANNE-SPICE\":\"reds\",\"CHAMPAGNE-R\":\"blondes\",\"CHESTNUT\":\"brunettes\",\"CHOCOLATE-FROST\":\"brunettes\",\"COCONUT-SPICE\":\"reds\",\"COFFEE-LATTE\":\"brunettes\",\"COFFEE-LATTE-R\":\"brunettes\",\"COPPER-GLAZE\":\"reds\",\"COPPER-GLAZE-R\":\"reds\",\"CREAMY-BLOND\":\"blondes\",\"CREAMY-BLONDE\":\"blondes\",\"CREAMY-TOFFEE\":\"blondes\",\"CREAMY-TOFFEE-LR\":\"blondes\",\"CREAMY-TOFFEE-R\":\"blondes\",\"CRIMSON-LR\":\"reds\",\"DARK-CHOCOLATE\":\"brunettes\",\"DARK-GOLDEN-BLONDE-FLUX\":\"brunettes\",\"DARK-RUST\":\"reds\",\"DARKEST-BRUNETTE\":\"brunettes\",\"DEEP-SMOKY-BROWN\":\"brunettes\",\"EXPRESSO\":\"blacks\",\"FROSTI-BLONDE\":\"blondes\",\"GARNET-GLAZE\":\"brunettes\",\"GINGER-BROWN\":\"brunettes\",\"GINGER-H\":\"brunettes\",\"GOLD-BLOND\":\"blondes\",\"GOLD-BLONDE\":\"blondes\",\"GOLDEN-BROWN\":\"brunettes\",\"HARVEST-GOLD\":\"brunettes\",\"HONEY-BROWN\":\"brunettes\",\"HONEY-BROWN-R\":\"brunettes\",\"HONEY-WHEAT\":\"brunettes\",\"ICE-BLOND\":\"blondes\",\"ICED-MOCHA\":\"brunettes\",\"ICED-MOCHA-R\":\"brunettes\",\"IRISH-SPICE\":\"reds\",\"JAVA-FROST\":\"brunettes\",\"LAVENDER-BLUSH-R\":\"fashion-color\",\"LIGHT-CHOCOLATE\":\"brunettes\",\"LIGHT-GOLDEN-BLONDE-FLU\":\"blondes\",\"LIGHTEST-BLONDE\":\"blondes\",\"MACADAMIA-LR\":\"brunettes\",\"MAPLE-SUGAR\":\"brunettes\",\"MAPLE-SUGAR-R\":\"brunettes\",\"MARBLE-BROWN\":\"brunettes\",\"MARBLE-BROWN-LR\":\"brunettes\",\"MARBLE-BROWN-R\":\"brunettes\",\"MEDIUM-BROWN\":\"brunettes\",\"MEDIUM-BRUNETTE-FLUX\":\"brunettes\",\"MELTED-MARSHMALLOW\":\"blondes\",\"MOCHA-BROWN\":\"brunettes\",\"MOCHACCINO\":\"brunettes\",\"MOCHACCINO-LR\":\"brunettes\",\"MOCHACCINO-R\":\"brunettes\",\"MOONLIGHT-BLONDE-R\":\"blondes\",\"NATURAL-TITANIUM\":\"grays\",\"NUTMEG-R\":\"blondes\",\"PLATINUM-PEARL\":\"blondes\",\"RAZBERRY-ICE\":\"reds\",\"RAZBERRY-ICE-R\":\"reds\",\"ROSE-GOLD-R\":\"blondes\",\"SANDY-SILVER\":\"grays\",\"SEAGLASS-R\":\"fashion-color\",\"SILVER-MINK\":\"grays\",\"SILVER-STONE\":\"grays\",\"SPRING-HONEY\":\"blondes\",\"SPRING-HONEY-R\":\"blondes\",\"STARLIGHT-BLONDE\":\"blondes\",\"STRAWBERRY-SWIRL\":\"blondes\",\"SUGAR-CANE\":\"blondes\",\"SUGAR-CANE-R\":\"blondes\",\"TOASTED-BROWN\":\"brunettes\",\"TOFFEE-BROWN\":\"brunettes\",\"VANILLA-LUSH\":\"blondes\",\"RUSTY-RED\":\"reds\",\"MELTED-SUNSET\":\"blondes\",\"PASTEL-BLUE-R\":\"fashion-color\",\"PLUMBERRY-JAM-LR\":\"fashion-color\",\"MELTED-COCONUT\":\"brunettes\",\"MILK-TEA-LR\":\"blondes\",\"SNOWY-SAPPHIRE-R\":\"grays\",\"KANDY-BROWN-LR\":\"brunettes\",\"SIMPLY-WHITE\":\"grays\",\"ILLUMINA-R\":\"grays\",\"SPRING-HONEY-T\":\"blondes\",\"MULBERRY-BROWN\":\"brunettes\",\"SMOKY-GRAY-R\":\"grays\",\"SILVER-STONE-R\":\"grays\",\"CASHMERE-BROWN-SR\":\"brunettes\",\"CHOCOLATE-PARFAIT-R\":\"brunettes\",\"GOLDEN-WHEAT\":\"blondes\",\"HAZLENUT-CREAM-R\":\"brunettes\",\"CHOCOLATE-TWIST\":\"brunettes\",\"MELTED-CARAMEL\":\"brunettes\",\"NATURAL-BLOND-ROOT\":\"blondes\",\"MEDIUM-NATURAL-BROWN\":\"brunettes\",\"HIGHLIGHTED-BLOND-ROOT\":\"blondes\",\"HIGHLIGHTED-BROWN-ROOT\":\"brunettes\",\"CHERRY-BROWN-R\":\"reds\",\"CHOCOLATE-TWIST-R\":\"brunettes\",\"NM-CHERRY-BROWN-R\":\"reds\",\"SEASHELL-BLOND-R\":\"blondes\",\"MELTED-CINNAMON\":\"brunettes\",\"ICY-CAVIAR\":\"blacks\",\"CHAMPAGNE-SILVER\":\"blondes\",\"FROST\":\"blondes\",\"TRUFFLE-BROWN-R\":\"brunettes\",\"MELTED-MARSHMELLOW\":\"blondes\",\"TRUFFLE-BROWN-LR\":\"brunettes\",\"HONEY-WHEAT-R\":\"brunettes\",\"MEDIUM-NATURAL-ROOT\":\"brunettes\",\"MILKY-OPAL-R\":\"blondes\",\"HAZELNUT-CREAM-R\":\"blondes\",\"ICY-OAK-SR\":\"brunettes\"}",
  "BelleTress": "{\"COFFEE-WITHOUT-CREAM\":\"brunettes\",\"CAPPUCCINO-WITH-CHERRY\":\"brunettes\",\"GINGER\":\"brunettes\",\"VANILLA-LUSH\":\"blondes\",\"CAYENNE-WITH-GINGER-ROOT\":\"reds\",\"COLA-WITH-CHERRY\":\"brunettes\",\"CHOCOLATE-WITH-CARAMEL\":\"brunettes\",\"HONEY-WITH-CHAI-LATTE\":\"blondes\",\"MOCHA-WITH-CREAM\":\"brunettes\",\"CHROME\":\"greys\",\"BUTTERBEER-BLONDE\":\"blondes\",\"CHAMPAGNE-WITH-APPLE-PIE\":\"blondes\",\"SUGAR-COOKIE-WITH-HAZELNUT\":\"blondes\",\"BOMBSHELL-BLONDE\":\"blondes\",\"ENGLISH-TOFFEE\":\"brunettes\",\"HONEY-CHAI-LATTE\":\"blondes\",\"CAPPUCINO-WITH-CHERRY\":\"brunettes\",\"MADEILINE-BLONDE\":\"blondes\",\"HONEY-CARAMEL\":\"blondes\",\"BROWN-SUGAR-SWEET-CREAM\":\"brunettes\",\"BRITISH-MILKTEA\":\"brunettes\",\"BROWNSUGAR-SWEETCREAM\":\"brunettes\",\"COOKIES-N-CREAM-BLONDE\":\"blondes\",\"CREAM-SODA-BLONDE\":\"blondes\",\"NUTELLA-BUTTERCREAM\":\"brunettes\",\"ROCA-MARGARITA-BLONDE\":\"blondes\",\"ROOTBEER-FLOAT-BLONDE\":\"blondes\",\"SUMPTUOUS-STRAWBERRY\":\"reds\",\"TRES-LECHES-BLONDE\":\"blondes\",\"SANGRIA\":\"reds\",\"STRAWBERRY-SHORTCAKE\":\"reds\",\"COCONUT-SILVER-BLONDE\":\"blondes\",\"GRAPHITE\":\"greys\",\"ICED-LAVENDAR-LATTE\":\"fashion-color\",\"DUSTY-ROSA\":\"fashion-color\",\"OCEAN-BLONDE\":\"fashion-color\",\"PURPLE-RAIN\":\"fashion-color\",\"RED-PENNY\":\"reds\",\"ROSE-GOLD\":\"fashion-color\",\"STARDUST\":\"fashion-color\",\"MARSHMELLOW-BLONDE\":\"blondes\",\"BEIGE-LINEN-BLONDE-R\":\"blondes\",\"BUTTERCREAM-BLONDE\":\"blondes\",\"CAKE-BATTER-BLONDE\":\"blondes\",\"CARAMEL-BLONDE-R\":\"blondes\",\"COOLEST-ASH-BROWN\":\"brunettes\",\"CRUSHED-ALMOND-BLONDE-R\":\"blondes\",\"DARK-BROWN+HL\":\"brunettes\",\"MILKSHAKE-BLONDE-R\":\"blondes\",\"MOCHA-MAPLE-BROWN\":\"brunettes\",\"OYSTER-GRAY\":\"greys\",\"RAW-SUGAR-BLONDE-R\":\"blondes\",\"SIENNA-SPICE\":\"reds\",\"BURNT-BISCUIT-BLONDE-R\":\"blondes\",\"CHOCOLATE-BUTTERCREAM-R\":\"brunettes\",\"COOL-CHAMPAGNE-BLONDE\":\"blondes\",\"GINGER-ALE-BLONDE\":\"blondes\",\"HAZLENUT-SYRUP\":\"brunettes\",\"OYSTER\":\"greys\",\"PUMPKIN-PIE-SPICE-R\":\"reds\",\"RICH-CHOCOLATE-BROWN-R\":\"brunettes\",\"SHAKEN-OATMILK-BLONDE-R\":\"blondes\",\"SUNKISSED-ALMOND-R\":\"brunettes\",\"SUNSET-BLONDE\":\"blondes\",\"TOASTED-WALNUT-R\":\"brunettes\",\"ICED-LAVENDER-LATTE\":\"fashion-color\",\"SUGAR-COOKIE-WITH-HAZLENUT\":\"blondes\",\"SUMPTOUS-STRAWBERRY\":\"reds\"}",
  "EasiHair": "{\"10H24B\":\"brunettes\",\"12/30BT\":\"brunettes\",\"12F\":\"blondes\",\"130/28\":\"reds\",\"130/31\":\"brunettes\",\"14/24\":\"blondes\",\"14/26\":\"blondes\",\"16/22\":\"blondes\",\"1B\":\"blacks\",\"1B/4\":\"blacks\",\"22MB\":\"blondes\",\"24B/27C\":\"blondes\",\"24B22\":\"blondes\",\"24B613\":\"blondes\",\"24BT102\":\"blondes\",\"24BT18\":\"brunettes\",\"27B\":\"blondes\",\"27MB\":\"brunettes\",\"27T33B\":\"brunettes\",\"27T613\":\"blondes\",\"30A\":\"reds\",\"31F\":\"brunettes\",\"31T26\":\"brunettes\",\"4/27/30\":\"blondes\",\"4/33\":\"brunettes\",\"4H27\":\"brunettes\",\"51\":\"grays\",\"6/33\":\"brunettes\",\"6/8\":\"brunettes\",\"613/102\":\"blondes\",\"613RN\":\"blondes\",\"8/30\":\"brunettes\",\"92B\":\"grays\",\"FIRE-N-ICE-27\":\"reds\",\"FUDGESICLE-6\":\"blondes\",\"HOT-FUDGE-1B\":\"brunettes\",\"RED\":\"reds\",\"WHITE-CHOCOLATE-613\":\"blacks\",\"4\":\"brunettes\",\"6F27\":\"brunettes\",\"8\":\"brunettes\",\"31/26\":\"reds\",\"33\":\"reds\",\"FS2V/31V\":\"brunettes\",\"FS4/33/30A\":\"brunettes\",\"FS6/30/27\":\"brunettes\",\"6\":\"brunettes\",\"4RN\":\"brunettes\",\"6RN\":\"brunettes\",\"8RN\":\"brunettes\",\"12FS8\":\"blondes\",\"12FS12\":\"blondes\",\"14/26S10\":\"blondes\",\"22F16S8\":\"blondes\",\"24B/27CS10\":\"blondes\",\"24B613S12\":\"blondes\",\"24B18S8\":\"blondes\",\"FS17/101S18\":\"blondes\",\"FS24/102S12\":\"blondes\",\"FS26/31S6\":\"reds\",\"613\":\"blondes\",\"2\":\"blacks\",\"10\":\"brunettes\",\"12\":\"brunettes\",\"27\":\"reds\",\"38\":\"grays\",\"39\":\"grays\",\"44\":\"grays\",\"48\":\"grays\",\"56\":\"grays\",\"60\":\"grays\"}",
  "Ellen Wille": "{\"12/26/27\":\"blondes\",\"132/133-133\":\"reds\",\"14/24-14\":\"blondes\",\"25/20/14\":\"blondes\",\"26/25/20\":\"blondes\",\"30/31-30\":\"blondes\",\"33/130/2\":\"brunettes\",\"4/6\":\"blacks\",\"6/830-6\":\"brunettes\",\"8/26-830\":\"blondes\",\"830/27-830\":\"brunettes\",\"AUBERGINE-MIX\":\"brunettes\",\"AUBURN-MIX\":\"reds\",\"AUBURN-R\":\"reds\",\"AUBURN-ROOTED\":\"reds\",\"Auburn-Rooted\":\"reds\",\"BERNSTEIN-MIX\":\"blondes\",\"BERNSTEIN-R\":\"blondes\",\"BERNSTEIN-ROOTED\":\"blondes\",\"BERNSTEIN/MIX\":\"blondes\",\"BLACK\":\"blacks\",\"BLACK-VIOLETT\":\"blacks\",\"BLACKCHERRY-MIX\":\"blacks\",\"Bernstein-Mix\":\"blondes\",\"Bernstein-Rooted\":\"blondes\",\"CAPPUCCINO-SOFTED\":\"blondes\",\"CARAMEL-LIGHTED\":\"blondes\",\"CARAMEL-MIX\":\"blondes\",\"CARAMEL-R\":\"blondes\",\"CARAMEL-ROOTED\":\"blondes\",\"CHAMPAGNE-MIX\":\"blondes\",\"CHAMPAGNE-R\":\"blondes\",\"CHAMPAGNE-ROOTED\":\"blondes\",\"CHAMPAGNE/MIX\":\"blondes\",\"CHAMPAGNE/ROOTED\":\"blondes\",\"CHERRY-RED-MIX\":\"reds\",\"CHESTNUT/MIX\":\"brunettes\",\"CHOCOLATE-MIX\":\"brunettes\",\"CHOCOLATE-R\":\"brunettes\",\"CHOCOLATE-ROOTED\":\"brunettes\",\"CHOCOLATE/MIX\":\"brunettes\",\"CHOCOLATE-TIPPED\":\"brunettes\",\"CINNAMON-BROWN-MIX\":\"brunettes\",\"CINNAMON-MIX\":\"reds\",\"CINNAMON-RED-MIX\":\"reds\",\"CINNAMON-R\":\"reds\",\"COFFEE-LIGHTED\":\"blondes\",\"COFFEE-MIX\":\"brunettes\",\"COGNAC-MIX\":\"blondes\",\"COGNAC-R\":\"reds\",\"COGNAC-ROOTED\":\"reds\",\"Caramel-Mix\":\"blondes\",\"Caramel-Rooted\":\"blondes\",\"Champagne-Mix\":\"blondes\",\"Champagne-Rooted\":\"blondes\",\"Chocolate-Mix\":\"brunettes\",\"Chocolate-Rooted\":\"brunettes\",\"Cinnamon-Rooted\":\"reds\",\"DARK-AUBURN-MIX\":\"brunettes\",\"DARK-CHERRY-MIX\":\"reds\",\"DARK-CHOCOLATE-M\":\"brunettes\",\"DARK-CHOCOLATE-MIX\":\"brunettes\",\"DARK-CHOCOLATE-R\":\"brunettes\",\"DARK-CHOCOLATE-ROOT\":\"brunettes\",\"DARK-CHOCOLATE-ROOTED\":\"brunettes\",\"DARK-CHOCOLATE/MIX\":\"brunettes\",\"DARK-ESPRESSO-MIX\":\"brunettes\",\"DARK-NOUGAT-ROOTED\":\"brunettes\",\"DARK-PEARL-ROOTED\":\"blondes\",\"DARK-SAND-LIGHTED\":\"brunettes\",\"DARK-SAND-MIX\":\"blondes\",\"DARK-SAND-R\":\"blondes\",\"DARK-SAND-ROOTED\":\"blondes\",\"DARK-SNOW-MIX\":\"grays\",\"DARKBLONDE\":\"blondes\",\"DARK-BROWN\":\"brunettes\",\"Dark-Auburn-Mix\":\"brunettes\",\"Dark-Chocolate-Mix\":\"brunettes\",\"Dark-Sand-Rooted\":\"blondes\",\"EBONY-BLACK\":\"brunettes\",\"ESPRESSO-MIX\":\"brunettes\",\"ESPRESSO-R\":\"brunettes\",\"ESPRESSO-ROOTED\":\"brunettes\",\"ESPRESSO/MIX\":\"brunettes\",\"Espresso-Mix\":\"brunettes\",\"Espresso-Rooted\":\"brunettes\",\"ESPRESSO-TIPPED\":\"brunettes\",\"FIRE-MIX\":\"brunettes\",\"FLAME-MIX\":\"reds\",\"Flame-Mix\":\"reds\",\"GINGER-BLONDE-MIX\":\"blondes\",\"GINGER-BLONDE-ROOTED\":\"blondes\",\"GINGER-MIX\":\"blondes\",\"GINGER-ROOTED\":\"blondes\",\"GINGER-BLONDE\":\"blondes\",\"GOLD-BLONDE\":\"blondes\",\"Ginger-Rooted\":\"blondes\",\"HAZELNUT-MIX\":\"brunettes\",\"HAZELNUT-R\":\"brunettes\",\"HAZELNUT-ROOTED\":\"brunettes\",\"HAZELNUT/MIX\":\"brunettes\",\"HAZLENUT-MIX\":\"brunettes\",\"HOLT-CHILLI-R\":\"reds\",\"HOT-AUBERGINE-MIX\":\"reds\",\"HOT-CHILI-ROOTED\":\"reds\",\"HOT-CHILLI-MIX\":\"reds\",\"HOT-CHILLI-R\":\"reds\",\"HOT-CHILLI-ROOTED\":\"reds\",\"HOT-CHOCOLATE-MIX\":\"brunettes\",\"HOT-CHOCOLATE-R\":\"reds\",\"HOT-ESPRESSO-MIX\":\"brunettes\",\"HOT-FLAME-LIGHTED\":\"reds\",\"HOT-FLAME-MIX\":\"reds\",\"HOT-GINGER-MIX\":\"blondes\",\"HOT-HAZELNUT-MIX\":\"brunettes\",\"HOT-HAZELNUT-ROOTED\":\"reds\",\"HOT-MOCCA-MIX\":\"brunettes\",\"HOT-MOCCA-R\":\"brunettes\",\"HOT-MOCCA-ROOTED\":\"brunettes\",\"Hazelnut-Mix\":\"brunettes\",\"Hot-Aubergine-Mix\":\"reds\",\"Hot-Chilli-Rooted\":\"reds\",\"Hot-Chocolate-Mix\":\"brunettes\",\"LIGHT-BERNSTEIN-MIX\":\"blondes\",\"LIGHT-BERNSTEIN-R\":\"blondes\",\"LIGHT-BERNSTEIN-ROOT\":\"blondes\",\"LIGHT-BERNSTEIN-ROOTE\":\"blondes\",\"LIGHT-BERNSTEIN-ROOTED\":\"blondes\",\"LIGHT-BERNSTEIN-RT\":\"blondes\",\"LIGHT-CARAMEL-MIX\":\"blondes\",\"LIGHT-CARAMEL-R\":\"blondes\",\"LIGHT-CARAMEL-ROOTED\":\"blondes\",\"LIGHT-CHAMPAGNE-M\":\"blondes\",\"LIGHT-CHAMPAGNE-MIX\":\"blondes\",\"LIGHT-CHAMPAGNE-R\":\"blondes\",\"LIGHT-CHAMPAGNE-ROOT\":\"blondes\",\"LIGHT-CHAMPAGNE-ROOTED\":\"blondes\",\"LIGHT-CHAMPAGNE-RT\":\"blondes\",\"LIGHT-CHAMPAGNE/ROOT\":\"blondes\",\"LIGHT-COFFEE/ROOTED\":\"brunettes\",\"LIGHT-HONEY-MIX\":\"blondes\",\"LIGHT-HONEY-R\":\"blondes\",\"LIGHT-HONEY-ROOTED\":\"blondes\",\"LIGHT-MANGO-MIX\":\"blondes\",\"LIGHT-MOCCA-MIX\":\"blondes\",\"LIGHT-MOCCA/MIX\":\"brunettes\",\"LIGHT-BLONDE\":\"blondes\",\"LIGHTBROWN\":\"brunettes\",\"LIGHT-GREY\":\"grays\",\"Light-Bernstein-Rooted\":\"blondes\",\"Light-Champagne-Rooted\":\"blondes\",\"Light-Honey-Rooted\":\"blondes\",\"Light-Mocca-Mix\":\"brunettes\",\"M14S\":\"blondes\",\"M17S\":\"brunettes\",\"M18S\":\"blondes\",\"M2S\":\"brunettes\",\"M34S\":\"brunettes\",\"M36S\":\"brunettes\",\"M38S\":\"brunettes\",\"M39S\":\"brunettes\",\"M3S\":\"brunettes\",\"M44S\":\"grays\",\"M46S\":\"grays\",\"M51S\":\"grays\",\"M56S\":\"grays\",\"M5S\":\"brunettes\",\"M6S\":\"brunettes\",\"M7S\":\"brunettes\",\"MAHOGANYBROWN\":\"brunettes\",\"MANGO-MIX\":\"reds\",\"MANGO-RED-ROOTED\":\"reds\",\"MEDIUM-BROWN\":\"brunettes\",\"MEDIUMGREY\":\"grays\",\"MOCCA-LIGHTED\":\"brunettes\",\"MOCCA-MIX\":\"brunettes\",\"MOCCA-R\":\"brunettes\",\"MOCCA-ROOTED\":\"brunettes\",\"MOCCA/MIX\":\"brunettes\",\"MOCCA/ROOTED\":\"brunettes\",\"Mocca-Mix\":\"brunettes\",\"Mocca-Rooted\":\"brunettes\",\"NATURALBLONDE\":\"blondes\",\"NATURE-BLONDE/MIX\":\"blondes\",\"NOUGAT-MIX\":\"blondes\",\"NOUGAT-R\":\"brunettes\",\"NOUGAT-ROOTED\":\"brunettes\",\"NUT-BROWN\":\"brunettes\",\"NATURAL-BLONDE\":\"brunettes\",\"Nature-Blonde-Mix\":\"blondes\",\"Nougat-Rooted\":\"brunettes\",\"PASTEL-BLONDE-MIX\":\"blondes\",\"PASTEL-BLONDE-R\":\"blondes\",\"PASTEL-BLONDE-ROOTED\":\"blondes\",\"PASTEL-MINT-R\":\"fashion-color\",\"PEARL-GREY\":\"grays\",\"PEARL-BLONDE-R\":\"blondes\",\"PEARL-BLONDE-ROOTED\":\"blondes\",\"PEARL-MIX\":\"blondes\",\"PEARL-ROOTED\":\"blondes\",\"PEPPER-MIX\":\"brunettes\",\"PLANTIN-BLONDE-MIX\":\"blondes\",\"PLATIN-BLONDE-MIX\":\"blondes\",\"PLATIN-BLONDE-R\":\"blondes\",\"PLATIN-BLONDE-ROOTED\":\"blondes\",\"PLATIN-MIX\":\"blondes\",\"PLATIN-ROOTED\":\"blondes\",\"PLATINUM-BLONDE\":\"blondes\",\"Platin-Blonde-Mix\":\"blondes\",\"SAFRAN-RED-MIX\":\"reds\",\"SAFRAN-RED-R\":\"reds\",\"SAFRAN-RED-ROOTED\":\"reds\",\"SAFRANRED-ROOTED\":\"reds\",\"SAFRANRED-R\":\"reds\",\"SALT-PEPPER-MIX\":\"grays\",\"SALT-PEPPER-ROOTED\":\"grays\",\"SALT-PEPPER-R\":\"grays\",\"SALT/PEPPER-MIX\":\"grays\",\"SALT/PEPPER-R\":\"grays\",\"SALT/PEPPER-ROOTED\":\"grays\",\"SAND-LIGHTED\":\"blondes\",\"SAND-MIX\":\"blondes\",\"SAND-MULTI-MIX\":\"blondes\",\"SAND-MULTI-R\":\"blondes\",\"SAND-MULTI-ROOTED\":\"blondes\",\"SAND-R\":\"blondes\",\"SAND-ROOTED\":\"blondes\",\"SAND/MIX\":\"blondes\",\"SANDMULTI-ROOTED\":\"blondes\",\"SANDY-BLONDE-MIX\":\"blondes\",\"SANDY-BLONDE-R\":\"blondes\",\"SANDY-BLONDE-ROOT\":\"blondes\",\"SANDY-BLONDE-ROOTED\":\"blondes\",\"SANDY-BLONDE/ROOTED\":\"blondes\",\"SILVER-BLONDE-ROOTED\":\"blondes\",\"SILVER-BLONDE-R\":\"blondes\",\"SILVER-GREY-R\":\"grays\",\"SILVER-MIX\":\"grays\",\"SILVER-ROOTED\":\"grays\",\"SILVERGREY\":\"grays\",\"SMOKE-MIX\":\"grays\",\"SMOKE-ROOTED\":\"grays\",\"SNOW-MIX\":\"grays\",\"SOFT-COPPER/ROOTED\":\"reds\",\"STONE-GREY-MIX\":\"grays\",\"STONEGREY-MIX\":\"grays\",\"Safran-Red-Rooted\":\"reds\",\"Sand-Mix\":\"brunettes\",\"Sandy-Blonde-Rooted\":\"blondes\",\"Silver-Mix\":\"grays\",\"Smoke-Mix\":\"grays\",\"Snow-Mix\":\"grays\",\"SNOW-ROOTED\":\"grays\",\"Stone-Grey-Mix\":\"grays\",\"TOBACCO-MIX\":\"brunettes\",\"TOBACCO-R\":\"brunettes\",\"TOBACCO-ROOTED\":\"brunettes\",\"Tobacco-Mix\":\"brunettes\",\"WHITE-MIX\":\"brunettes\",\"SANDY-BLONDE/R\":\"blondes\",\"SAND-TIPPED\":\"brunettes\",\"CANDY-BLONDE-ROOTED\":\"blondes\",\"SILVER BLONDE ROOTED\":\"blondes\",\"SILVER-GREY\":\"grays\",\"COSMO-BLACK-MIX\":\"brunettes\",\"CHOCOLATE-LIGHTED\":\"brunettes\",\"HAZELNUT-LIGHTED\":\"brunettes\",\"FIREBALL-LIGHTED\":\"reds\",\"TOBACCO-LIGHTED\":\"brunettes\",\"NUT-BROWN-LIGHTED\":\"brunettes\",\"PEARL-BLONDE-MIX\":\"blondes\",\"AUBURN-LIGHTED\":\"reds\",\"HOT-FLAME-R\":\"reds\",\"WILD-CHERRY-R\":\"reds\",\"CHERRY-MIX\":\"reds\",\"PEPPER-MULTI-MIX\":\"grays\",\"WINE-RED-R\":\"reds\",\"ROSEWOOD\":\"reds\",\"LAVENDER\":\"fashion-color\",\"ROSE-BLONDE\":\"fashion-color\",\"ICE-BLUE\":\"fashion-color\",\"ROSEWOOD-R\":\"reds\",\"PASTEL-LILAC-R\":\"fashion-color\",\"PASTEL-ROSE-R\":\"fashion-color\",\"STONE-GREY-R\":\"grays\",\"SILVER-GREY-MIX\":\"grays\",\"SAFRAN ROOTED\":\"reds\",\"AUBERGINE-ROOTED\":\"reds\",\"HOT-CHILI-MIX\":\"reds\",\"ESPRESSO-LIGHTED\":\"brunettes\",\"PASTEL-ROSE-ROOTED\":\"fashion-color\",\"LAVENDER-ROOTED\":\"fashion-color\",\"ROSEWOOD-ROOTED\":\"fashion-color\",\"PASTEL-MINT-ROOTED\":\"fashion-color\",\"DARK-SNOW-ROOTED\":\"grays\",\"LIGHTBERNSTEIN-ROOTED\":\"blondes\",\"LIGHTCHAMPAGNE-ROOTED\":\"blondes\",\"ESPRESSO-M\":\"brunettes\",\"CANDY-BLONDE-R\":\"blondes\",\"CINNAMON-BROWN-m\":\"brunettes\",\"GINGER-M\":\"blondes\",\"TEAK-MIX\":\"brunettes\",\"TABAC-ROOTED\":\"brunettes\",\"WALNUT-MIX\":\"brunettes\",\"TABAC-LIGHTED\":\"brunettes\",\"M56S \":\"grays\",\"DARK-AUBURN-ROOTED\":\"reds\",\"DARK-BROWN-SHADED\":\"brunettes\",\"DARK-CHOCOLATE-SHADED\":\"brunettes\",\"PLUM-RED-SHADED\":\"reds\",\"CHOCOLATE-SHADED\":\"brunettes\",\"TOFFEE-BROWN-SHADED\":\"brunettes\",\"NUT-MULTI-SHADED\":\"brunettes\",\"BAHAMA-BEIGE-SHADED\":\"blondes\",\"CREAM-BLONDE-SHADED\":\"blondes\",\"PLATIN-BLONDE-SHADED\":\"blondes\",\"DARK-BROWN-MIX\":\"brunettes\",\"DARK-GREY-MIX\":\"grays\",\"LIGHT-GREY-MIX\":\"grays\",\"CHAMPAGNE-SHADED\":\"blondes\",\"SAHARA-BEIGE-MIX\":\"blondes\",\"BERNSTEIN-SHADED\":\"brunettes\",\"RED-VINO-SHADED\":\"reds\",\"GRANAT-RED-SHADED\":\"reds\",\"TEAK-BROWN-SHADED\":\"brunettes\",\"BEIGE-MULTI-SHADED\":\"blondes\",\"IVORY-BLONDE-SHADED\":\"blondes\",\"ASH-GREY-SHADED\":\"grays\",\"MIDDLE-GREY-MIX\":\"grays\",\"RED-VINO-MIX\":\"reds\",\"IVORY-GREY-MIX\":\"grays\",\"SILK-GREY-MIX\":\"grays\",\"BAHAMA-BEIGE-MIX\":\"blondes\",\"CHOCOLATE-MULTI-MIX\":\"brunettes\",\"CHESTNUT-MIX\":\"brunettes\",\"TOFFEE-BROWN-MIX\":\"brunettes\",\"SAHARA-BEIGE-SHADED\":\"blondes\",\"MIDDLE-GREY-SHADED\":\"grays\",\"IVORY-GREY-SHADED\":\"grays\",\"NOUGAT-TIPPED\":\"brunettes\",\"CINNAMON-BROWN-ROOTED\":\"reds\",\"SAFRAN-BROWN-ROOTED\":\"reds\",\"BEIGE-PASTEL-SHADED\":\"blondes\",\"BERNSTEIN-MULTI-SHADED\":\"blondes\",\"LIGHT-ESPRESSO-MIX\":\"brunettes\",\"COFFEE-BROWN-MIX\":\"brunettes\",\"DARK-BLONDE\":\"blondes\",\"MAHOGANY-BROWN\":\"brunettes\",\"MIDDLE-BLONDE\":\"blondes\",\"MIDDLE-BROWN\":\"brunettes\",\"CHOCOLATE-BROWN\":\"brunettes\",\"LIGHT-BROWN\":\"brunettes\",\"NUT-BROWN-MIX\":\"brunettes\",\"DARK-CHOCOLATE-LIGHTED\":\"brunettes\",\"SAFRAN-ROOTED\":\"reds\",\"SAND-2-TONE\":\"blondes\",\"TOFFEE-2-TONE\":\"brunettes\",\"SOFT-COPPER-ROOTED\":\"reds\",\"PLUM-BROWN-ROOTED\":\"brunettes\",\"COPPER-BROWN-MIX\":\"reds\",\"SAHARA-BEIGE-ROOTED\":\"blondes\",\"TIZIAN-RED-SHADED\":\"reds\",\"RUBY-RED-MIX\":\"reds\",\"METALLIC-PURPLE-ROOTED\":\"fashion-color\",\"METALLIC-ROSE-ROOTED\":\"fashion-color\",\"BISQUIT-BLONDE-ROOTED\":\"blondes\",\"NATURE-WHITE-MIX\":\"grays\",\"NUT-BROWN-ROOTED\":\"brunettes\",\"POWDER-BLONDE-TIPPED\":\"fashion-color\",\"METALLIC-BLONDE-ROOTED\":\"grays\",\"CHERRY-RED-ROOTED\":\"reds\",\"ICE-BLUE-TIPPED\":\"fashion-color\",\"BLACK-CHERRY-MIX\":\"blacks\",\"PEPPER-LIGHTED\":\"grays\",\"SUNNY-BLONDE-MIX\":\"blondes\",\"IVORY-BLONDE-TIPPED\":\"blondes\",\"HOT-FLAME-ROOTED\":\"reds\",\"TABACCO-ROOTED\":\"blondes\",\"AUBURN\":\"reds\",\"MOCCA-TONED\":\"reds\",\"LIGHTBEIGEBLONDE\":\"blondes\",\"PASTEL-BLONDE\":\"blondes\",\"M56/60S\":\"grays\",\"PASTEL-MINT-SHADED\":\"blondes\",\"SANDY-BLONDE\":\"blondes\",\"PEPPER-BROWN-MIX\":\"grays\",\"PASTEL-ROSE-SHADED\":\"fashion-color\",\"DARK-BROWN-LIGHTED\":\"brunettes\",\"LIGHT-CHAMPAGNE-SHADED\":\"grays\",\"MAHOGANY-MIX\":\"brunettes\",\"MEDIUM-GREY\":\"grays\",\"DARK-WINE-RED-MIX\":\"brunettes\",\"ASH-GREY-MIX\":\"grays\",\"DARK-BROWN-TIPPED\":\"brunettes\",\"COFFEE-BROWN-ROOTED\":\"brunettes\",\"PEPPER-GREY-MIX\":\"grays\",\"DARKBROWN\":\"brunettes\",\"COPPER-MIX\":\"reds\",\"BERNSTEIN-MULTI-TIPPED\":\"blondes\",\"CHESTNUT-SHADED\":\"brunettes\",\"SANDYBLONDE-MIX\":\"blondes\",\"PLUM-RED-MIX\":\"reds\",\"GREY-MULTI-SHADED\":\"grays\",\"TEAK-BROWN-MIX\":\"blondes\",\"CHOCO-BROWN\":\"brunettes\",\"SALT\\\\PEPPER-MIX\":\"grays\",\"HOT-CINNAMON-MIX\":\"reds\",\"CHOCOLATEBROWN\":\"brunettes\",\"SMOKE-BLONDE-MIX\":\"grays\",\"BAHAMA-BEIGE-TIPPED\":\"blondes\",\"RED-PEPPER-MIX\":\"reds\",\"DARK-SAND-TIPPED\":\"blondes\",\"ROSE-BLONDE-ROOTED\":\"blondes\",\"LIGHT-BERSTEIN-ROOTED\":\"blondes\",\"SANDMULTI-MIX\":\"blondes\",\"NOUGAT-LIGHTED\":\"blondes\",\"DARK-GREY-SHADED\":\"grays\",\"BEIGE-MULTI-MIX\":\"blondes\",\"HOT-CHOCOLATE-ROOTED\":\"brunettes\",\"GRANAT-RED-MIX\":\"brunettes\",\"LIGHT-PEARL-MIX\":\"brunettes\",\"RUBY-RED-TIPPED\":\"reds\",\"BEIGEBLONDE\":\"blondes\",\"STONE-GREY-ROOTED\":\"grays\",\"SILK-GREY-SHADED\":\"grays\",\"DARK-SAND-SHADED\":\"blondes\",\"CINNAMON-BROWN-LIGHTED\":\"brunettes\",\"DARKSAND-MIX\":\"blondes\",\"LIGHTBLONDE\":\"blondes\",\"DARK-CHOCOLATE-TIPPED\":\"brunettes\",\"BEAUJOLAIS\":\"reds\",\"COFFEE-BROWN-LIGHTED\":\"blondes\",\"MIDDLEBROWN\":\"brunettes\",\"TOFFEE-BROWN-LIGHTED\":\"brunettes\",\"CHAMPAGNE-TONED\":\"blondes\",\"POLAR-SILVER-SHADED\":\"grays\",\"ICE-BLONDE-SHADED\":\"grays\",\"ICE-BLUE-ROOTED\":\"grays\",\"TOFFEE-BLONDE-ROOTED\":\"blondes\",\"WINE-RED-ROOTED\":\"blondes\",\"SANDY-BLONDE-TONED\":\"blondes\",\"CANDY-BLONDE-TIPPED\":\"grays\",\"PEARL-GREY-MIX\":\"brunettes\",\"ROSEWOOD-BROWN-SHADED\":\"brunettes\",\"MIDDLEBLONDE\":\"blondes\",\"BURGUNDY-MIX\":\"reds\",\"SAND-SHADED\":\"blondes\",\"DARK-NOUGAT-MIX\":\"brunettes\",\"COSMO-BLACK\":\"blacks\",\"PASTEL-LILAC-ROOTED\":\"fashion-color\",\"FLAME-ROOTED\":\"reds\",\"SAND-MUTLI-ROOTED\":\"blondes\",\"NUT-MULTI-LIGHTED\":\"blondes\",\"METALLIC-BLONDE-SHADED\":\"grays\"}",
  "Envy": "{\"ALMOND-BREEZE\":\"brunettes\",\"AMARETTO-&-CREAM\":\"brunettes\",\"AMARETTO-CREAM\":\"brunettes\",\"BLACK\":\"brunettes\",\"CHOCOLATE-CARAMEL\":\"brunettes\",\"CHOCOLATE-CHERRY\":\"brunettes\",\"CINNAMON-RAISIN\":\"reds\",\"CREAMED-COFFEE\":\"brunettes\",\"DARK-BLONDE\":\"blondes\",\"DARK-BROWN\":\"brunettes\",\"DARK-GREY\":\"grays\",\"DARK-RED\":\"reds\",\"FROSTED\":\"blondes\",\"GINGER-CREAM\":\"blondes\",\"GOLDEN-NUTMEG\":\"brunettes\",\"LIGHT-BLONDE\":\"blondes\",\"LIGHT-BROWN\":\"brunettes\",\"LIGHT-GREY\":\"grays\",\"LIGHTER-RED\":\"reds\",\"MEDIUM-BLONDE\":\"blondes\",\"MEDIUM-BROWN\":\"brunettes\",\"MEDIUM-GREY\":\"grays\",\"MOCHA-FROST\":\"blondes\",\"SPARKLING-CHAMPAGN\":\"blondes\",\"SPARKLING-CHAMPAGNE\":\"blondes\",\"TOASTED-SESAME\":\"brunettes\",\"VANILLA-BUTTER\":\"blondes\",\"SPARKLING-CHAMPAG\":\"blondes\",\"BUTTERSCOTCH-SHADOW\":\"blondes\",\"CHAMPAGNE-SHADOW\":\"blondes\",\"CINNAMON-TOFFEE\":\"brunettes\",\"ESPRESSO\":\"brunettes\",\"GOLDEN-SANDSTONE\":\"blondes\",\"HONEY-BREEZE\":\"blondes\",\"MACCHIATO\":\"brunettes\",\"PLATINUM-SHADOW\":\"blondes\",\"SAFFRON-SPICE\":\"reds\",\"SAHARA-BLONDE\":\"blondes\",\"SILKY-BEIGE\":\"blondes\",\"STERLING-SHADOW\":\"grays\"}",
  "Estetica": "{\"CARAMELKISS\":\"brunettes\",\"CARMELKISS\":\"brunettes\",\"CARMKISSM\":\"brunettes\",\"CHROMERT1B\":\"grays\",\"CKISSRT4\":\"brunettes\",\"HARVESTGOLD\":\"brunettes\",\"HONEY-TOAST\":\"blondes\",\"HONEYTOAST\":\"blondes\",\"ICED-GRAY\":\"grays\",\"R1/4\":\"brunettes\",\"R10/14\":\"brunettes\",\"R10/24/80\":\"brunettes\",\"R10/24BT\":\"brunettes\",\"R10/27H\":\"brunettes\",\"R101\":\"blondes\",\"R12/14\":\"blondes\",\"R12/26CH\":\"brunettes\",\"R12/26CHM\":\"brunettes\",\"R12/26H\":\"brunettes\",\"R12/26RT4\":\"brunettes\",\"R130\":\"reds\",\"R133/24H\":\"reds\",\"R133F\":\"reds\",\"R14/16\":\"blondes\",\"R14/24\":\"blondes\",\"R14/26/613\":\"blondes\",\"R14/26CH\":\"blondes\",\"R14/26H\":\"blondes\",\"R14/88H\":\"brunettes\",\"R14/8H\":\"brunettes\",\"R140/14\":\"blondes\",\"R16/100\":\"blondes\",\"R16/22\":\"blondes\",\"R16/88H\":\"blondes\",\"R17/101\":\"blondes\",\"R18/22\":\"blondes\",\"R18/22T\":\"blondes\",\"R18/24H\":\"blondes\",\"R1B\":\"brunettes\",\"R2\":\"brunettes\",\"R2/4\":\"brunettes\",\"R20F\":\"reds\",\"R20RT8\":\"blondes\",\"R22\":\"blondes\",\"R22/102\":\"blondes\",\"R24/18\":\"blondes\",\"R24/18BT\":\"blondes\",\"R24/18BTBR8\":\"brunettes\",\"R24/18BTRT8\":\"brunettes\",\"R2418BTRT8\":\"brunettes\",\"R25LF123\":\"blondes\",\"R26/613\":\"blondes\",\"R27\":\"blondes\",\"R30\":\"reds\",\"R30/28/26\":\"reds\",\"R30/28/26RT4\":\"reds\",\"R32/28H\":\"reds\",\"R32/33/40F\":\"reds\",\"R32F\":\"reds\",\"R33\":\"reds\",\"R33LF24\":\"reds\",\"R34\":\"grays\",\"R344LF58\":\"grays\",\"R36F\":\"brunettes\",\"R37\":\"grays\",\"R38\":\"grays\",\"R4\":\"brunettes\",\"R4/27R\":\"brunettes\",\"R4/33H\":\"brunettes\",\"R4/6\":\"brunettes\",\"R4/8\":\"brunettes\",\"R44\":\"grays\",\"R51\":\"grays\",\"R51LF60\":\"grays\",\"R56\":\"grays\",\"R56/60\":\"grays\",\"R56T\":\"grays\",\"R59T\":\"grays\",\"R6\":\"brunettes\",\"R6/10\":\"brunettes\",\"R6/12H\":\"brunettes\",\"R6/27H\":\"brunettes\",\"R6/28F\":\"brunettes\",\"R6/30/33\":\"brunettes\",\"R6/30H\":\"brunettes\",\"R6/31/350\":\"brunettes\",\"R60\":\"grays\",\"R613\":\"blondes\",\"R613/20H\":\"blondes\",\"R613/24H\":\"blondes\",\"R613/27\":\"blondes\",\"R6LF29\":\"brunettes\",\"R8\":\"brunettes\",\"R8/10/27/20\":\"brunettes\",\"R8/12\":\"brunettes\",\"R8/26H\":\"brunettes\",\"R8/30\":\"brunettes\",\"R8/32H\":\"brunettes\",\"R8LF14\":\"brunettes\",\"R9/12\":\"brunettes\",\"RH1016\":\"brunettes\",\"RH12/26RT4\":\"brunettes\",\"RH1226\":\"brunettes\",\"RH14/88\":\"blondes\",\"RH1488\":\"blondes\",\"RH1488M\":\"blondes\",\"RH1488RT8\":\"blondes\",\"RH26/613RT8\":\"blondes\",\"RH268\":\"brunettes\",\"RH31\":\"reds\",\"RJ20/27/10\":\"brunettes\",\"RM12/26CH\":\"blondes\",\"RM6/28F\":\"brunettes\",\"RM8/26H\":\"brunettes\",\"RM8LF26\":\"blondes\",\"RMCARMKISS\":\"brunettes\",\"RMCKISSRT4\":\"brunettes\",\"RMH12/26RT4\":\"brunettes\",\"RMH268\":\"brunettes\",\"ROM12/26\":\"brunettes\",\"ROM1488\":\"blondes\",\"ROM6/27\":\"reds\",\"ROM6/28\":\"brunettes\",\"ROM6240RT4\":\"brunettes\",\"RT27/30\":\"reds\",\"RT330RT4\":\"reds\",\"RT613/27\":\"blondes\",\"RTH6/28\":\"reds\",\"RTH613/27\":\"blondes\",\"RTRED\":\"reds\",\"SPICE\":\"reds\",\"STAR-FIRE\":\"reds\",\"STARFIRE\":\"reds\",\"VOGUE\":\"reds\",\"CHOCOLATE-SMOKE\":\"fashion-color\",\"ICY-SHADOW\":\"fashion-color\",\"R25F\":\"blondes\",\"R25/88\":\"blondes\",\"LILAC-HAZE\":\"fashion-color\",\"SILVERSUNRT8\":\"blondes\",\"SILVERSUN/RT8\":\"blondes\",\"RH12/26\":\"brunettes\",\"RM12/26CHM\":\"brunettes\",\"RMCKISSM\":\"brunettes\",\"SMOKY-ROSE\":\"fashion-color\",\"AMERICANO\":\"brunettes\",\"ICED-MOCHA\":\"brunettes\",\"TOFFEE-LATTE\":\"brunettes\",\"VANILLA-MACCHIATO\":\"brunettes\",\"R2418BT\":\"blondes\",\"CARAMEL-KISS\":\"brunettes\",\"R24/18BTR8\":\"blondes\",\"R613BG14\":\"blondes\",\"R613BG26\":\"blondes\",\"R18\":\"blondes\",\"R24\":\"blondes\",\"R12/30BT\":\"brunettes\",\"R14/8C\":\"brunettes\",\"SUNLIT-BLONDE\":\"blondes\",\"SUNLITBLONDE\":\"blondes\",\"COPPER-SUNSET\":\"brunettes\",\"GOLDEN-GINGER\":\"blondes\",\"MANDARIN-ROOTED\":\"blondes\",\"GRAYDIENT-STORM\":\"grays\",\"RMCARMELKISS\":\"blondes\"}",
  "Gabor": "{\"305C\":\"grays\",\"511C\":\"grays\",\"BLACK\":\"brunettes\",\"BROWN-BLONDE\":\"blondes\",\"BROWN-GREY\":\"grays\",\"BROWN/BLONDE\":\"blondes\",\"BROWN/GREY\":\"grays\",\"DARK-BLONDE\":\"blondes\",\"DARK-BROWN\":\"brunettes\",\"G10+\":\"brunettes\",\"G101+\":\"grays\",\"G11+\":\"brunettes\",\"G12+\":\"brunettes\",\"G13+\":\"blondes\",\"G14+\":\"blondes\",\"G15+\":\"blondes\",\"G16+\":\"blondes\",\"G19+\":\"blondes\",\"G20+\":\"blondes\",\"G27+\":\"reds\",\"G29+\":\"reds\",\"G30+\":\"reds\",\"G38+\":\"grays\",\"G4+\":\"brunettes\",\"G48+\":\"grays\",\"G56+\":\"grays\",\"G58+\":\"grays\",\"G6+\":\"brunettes\",\"G60+\":\"grays\",\"G630+\":\"brunettes\",\"G8+\":\"brunettes\",\"G811+\":\"brunettes\",\"G829+\":\"brunettes\",\"GL-14-16SS\":\"brunettes\",\"GL-23-101SS\":\"blondes\",\"GL1-2\":\"brunettes\",\"GL10-12\":\"brunettes\",\"GL10-14\":\"blondes\",\"GL10/12\":\"brunettes\",\"GL10/14\":\"blondes\",\"GL11-25\":\"blondes\",\"GL11-25SS\":\"blondes\",\"GL11/25\":\"blondes\",\"GL12-14\":\"blondes\",\"GL12-16\":\"blondes\",\"GL12/14\":\"blondes\",\"GL12/16\":\"blondes\",\"GL14-16\":\"blondes\",\"GL14-16SS\":\"blondes\",\"GL14-22\":\"blondes\",\"GL14-22SS\":\"blondes\",\"GL14/16\":\"blondes\",\"GL14/22\":\"blondes\",\"GL15-16SS\":\"blondes\",\"GL15-26\":\"blondes\",\"GL15-26SS\":\"blondes\",\"GL15/26\":\"blondes\",\"GL16-27\":\"blondes\",\"GL16-27SS\":\"blondes\",\"GL16/27\":\"blondes\",\"GL18-23\":\"brunettes\",\"GL18/23\":\"blondes\",\"GL2-6\":\"brunettes\",\"GL2/6\":\"brunettes\",\"GL23-101\":\"blondes\",\"GL23-101SS\":\"blondes\",\"GL23/101\":\"blondes\",\"GL27-22\":\"reds\",\"GL27-29\":\"reds\",\"GL27/22\":\"reds\",\"GL27/29\":\"reds\",\"GL29-31\":\"reds\",\"GL29-31SS\":\"reds\",\"GL29/31\":\"reds\",\"GL30-32\":\"reds\",\"GL30/32\":\"reds\",\"GL33-130\":\"reds\",\"GL33/130\":\"reds\",\"GL38-48\":\"grays\",\"GL38/48\":\"grays\",\"GL4-8\":\"brunettes\",\"GL4/8\":\"brunettes\",\"GL44-51\":\"grays\",\"GL44/51\":\"grays\",\"GL51-56\":\"grays\",\"GL51/56\":\"grays\",\"GL56-60\":\"grays\",\"GL56/60\":\"grays\",\"GL6-30\":\"brunettes\",\"GL6/30\":\"brunettes\",\"GL60-101\":\"grays\",\"GL60/101\":\"grays\",\"GL8-10\":\"brunettes\",\"GL8-29\":\"brunettes\",\"GL8-29SS\":\"brunettes\",\"GL8/10\":\"brunettes\",\"GL8/29\":\"brunettes\",\"GRAY\":\"grays\",\"GTL11-25SS\":\"blondes\",\"LIGHT-BLONDE\":\"blondes\",\"LIGHT-BROWN\":\"brunettes\",\"LIGHT-GREY\":\"grays\",\"LIGHT-RED\":\"reds\",\"MEDIUM-BLONDE\":\"blondes\",\"MEDIUM-BROWN\":\"brunettes\",\"MEDIUM-RED\":\"reds\",\"GL44-66SS\":\"grays\",\"GL613-88SS\":\"blondes\",\"G2+\":\"blacks\",\"G17+\":\"blondes\",\"G31+\":\"reds\",\"SS-LIGHT-BLONDE\":\"blondes\",\"SS-MEDIUM-BLONDE\":\"blondes\",\"GF1-2\":\"brunettes\",\"GF6-8\":\"brunettes\",\"GF6-30\":\"brunettes\",\"GF56-60\":\"grays\",\"GF56-1001\":\"grays\",\"GF14-88\":\"blondes\",\"GF16-22\":\"blondes\",\"GF17-23SS\":\"blondes\",\"GF19-23\":\"blondes\",\"GF19-23SS\":\"blondes\",\"GF29-25\":\"reds\",\"GF29-33SS\":\"reds\",\"GF31-29\":\"reds\",\"GF4-10SS\":\"brunettes\",\"GF44-60SS\":\"grays\",\"GF511\":\"grays\",\"GF8-12SS\":\"brunettes\",\"GF8-29SS\":\"brunettes\",\"GF9-24SS\":\"brunettes\",\"GF10-22SS\":\"brunettes\",\"GF11-25SS\":\"brunettes\",\"GF119\":\"grays\",\"GF12-22SS\":\"brunettes\",\"GF132SS \":\"reds\",\"GF14-22SS\":\"blondes\",\"GF51-61\":\"grays\",\"GF14-88SS\":\"blondes\",\"GF4-6\":\"brunettes\",\"MEDIUM-BLONDE-ROOTED\":\"blondes\",\"LIGHT-BLONDE-ROOTED\":\"blondes\"}",
  "Hairdo": "{\"60/6\":\"grays\",\"AMETHYST\":\"reds\",\"BERRY-SORBET\":\"fashion-color\",\"BLUE\":\"fashion-color\",\"CHROME-MIST\":\"fashion-color\",\"F11/60/8-Lilac-Frost\":\"fashion-color\",\"ICED-VIOLET\":\"fashion-color\",\"MIDNIGHTBERRY\":\"fashion-color\",\"MINT\":\"fashion-color\",\"PEACH\":\"fashion-color\",\"PINK\":\"fashion-color\",\"PINK-FROST\":\"fashion-color\",\"PURPLE\":\"fashion-color\",\"R01422\":\"blondes\",\"R10\":\"brunettes\",\"R10-BLUE\":\"brunettes\",\"R10-DARK-PURPLE\":\"brunettes\",\"R10-DENIM-BLUE\":\"brunettes\",\"R10-GREEN\":\"brunettes\",\"R10-LAVENDER\":\"brunettes\",\"R10-PINK\":\"brunettes\",\"R10-RED-WINE\":\"brunettes\",\"R10HH\":\"blondes\",\"R119G\":\"grays\",\"R11S+\":\"brunettes\",\"R14/25\":\"blondes\",\"R14/25-GREEN\":\"blondes\",\"R14/25-LAVENDER\":\"blondes\",\"R14/88\":\"blondes\",\"R14/88H\":\"blondes\",\"R14/88H-BLUE\":\"blondes\",\"R14/88H-DARK-PURPLE\":\"blondes\",\"R14/88H-DENIM-BLUE\":\"blondes\",\"R14/88H-GREEN\":\"blondes\",\"R14/88H-LAVENDER\":\"blondes\",\"R14/88H-PINK\":\"blondes\",\"R14/88H-RED-WINE\":\"blondes\",\"R1416T\":\"blondes\",\"R1416T-BLUE\":\"blondes\",\"R1416T-DARK-PURPLE\":\"blondes\",\"R1416T-DENIM-BLUE\":\"blondes\",\"R1416T-GREEN\":\"blondes\",\"R1416T-LAVENDER\":\"blondes\",\"R1416T-PINK\":\"blondes\",\"R1416T-RED-WINE\":\"blondes\",\"R1621S+\":\"blondes\",\"R1HH\":\"blacks\",\"R2\":\"blacks\",\"R2-DARK-PURPLE\":\"blacks\",\"R2-DENIM-BLUE\":\"blacks\",\"R2-RED-WINE\":\"blacks\",\"R2/R6\":\"blacks\",\"R22\":\"blondes\",\"R22-BLUE\":\"blondes\",\"R22-PINK\":\"blondes\",\"R25\":\"blondes\",\"R25-BLUE\":\"blondes\",\"R25-DARK-PURPLE\":\"blondes\",\"R25-DENIM-BLUE\":\"blondes\",\"R25-GREEN\":\"blondes\",\"R25-LAVENDER\":\"blondes\",\"R25-RED-WINE\":\"blondes\",\"R28S\":\"reds\",\"R28S-LAVENDER\":\"reds\",\"R29S\":\"blondes\",\"R29S+\":\"blondes\",\"R29S-GREEN\":\"blondes\",\"R3025S+\":\"reds\",\"R3329S+\":\"reds\",\"R38\":\"grays\",\"R3HH\":\"blacks\",\"R4\":\"brunettes\",\"R4-Blue\":\"brunettes\",\"R4-DARK-PURPLE\":\"brunettes\",\"R4-DENIM-BLUE\":\"brunettes\",\"R4-GREEN\":\"brunettes\",\"R4-LAVENDER\":\"brunettes\",\"R4-PINK\":\"brunettes\",\"R4-RED-WINE\":\"brunettes\",\"R4/R8\":\"brunettes\",\"R435S+\":\"brunettes\",\"R4HH\":\"brunettes\",\"R56\":\"grays\",\"R56/60\":\"grays\",\"R56/60-GREEN\":\"grays\",\"R56/60-LAVENDER\":\"grays\",\"R56/60-PINK\":\"grays\",\"R5HH\":\"brunettes\",\"R6\":\"brunettes\",\"R6-GREEN\":\"brunettes\",\"R6/30H\":\"brunettes\",\"R6/30H-BLUE\":\"brunettes\",\"R6/30H-DARK-PURPLE\":\"brunettes\",\"R6/30H-DENIM-BLUE\":\"brunettes\",\"R6/30H-GREEN\":\"brunettes\",\"R6/30H-LAVENDER\":\"brunettes\",\"R6/30H-PINK\":\"brunettes\",\"R6/30H-RED-WINE\":\"brunettes\",\"R6HH\":\"brunettes\",\"R7HH\":\"brunettes\",\"R829S+\":\"brunettes\",\"R830\":\"brunettes\",\"R830-LAVENDER\":\"brunettes\",\"R9HH\":\"blondes\",\"SS14/25\":\"blondes\",\"SS14/88\":\"blondes\",\"SS14/88H\":\"blondes\",\"SS25\":\"blondes\",\"STORMY-BLUE\":\"fashion-color\",\"R16\":\"blondes\",\"R27T\":\"reds\",\"R1B\":\"blacks\",\"RL10/12\":\"brunettes\",\"RL11/25\":\"brunettes\",\"RL119\":\"grays\",\"RL12/16\":\"blondes\",\"RL12/22SS\":\"blondes\",\"RL13/88\":\"blondes\",\"RL14/22\":\"blondes\",\"RL14/22SS\":\"blondes\",\"RL14/25\":\"blondes\",\"RL16/88\":\"blondes\",\"RL19/23\":\"blondes\",\"RL19/23SS\":\"blondes\",\"RL2/4\":\"brunettes\",\"RL25/27\":\"reds\",\"RL29/25\":\"reds\",\"RL30/27\":\"reds\",\"RL31/29\":\"reds\",\"RL32/31\":\"reds\",\"RL33/35\":\"reds\",\"RL38\":\"grays\",\"RL4/6\":\"brunettes\",\"RL5/27\":\"brunettes\",\"RL511\":\"grays\",\"RL51/61\":\"grays\",\"RL56/60\":\"grays\",\"RL6/28\":\"brunettes\",\"RL6/30\":\"brunettes\",\"RL6/8\":\"brunettes\",\"RL8/29\":\"brunettes\",\"RL8/29SS\":\"brunettes\",\"SS10\":\"brunettes\",\"SS10/16\":\"brunettes\",\"SS11/29\":\"brunettes\",\"SS12/20\":\"brunettes\",\"SS12/22\":\"blondes\",\"SS130\":\"reds\",\"SS14/22\":\"blondes\",\"SS15/24\":\"blondes\",\"SS19/23\":\"blondes\",\"SS23\":\"blondes\",\"SS23/61\":\"blondes\",\"SS26\":\"blondes\",\"SS29\":\"reds\",\"SS29/20\":\"reds\",\"SS30/28\":\"reds\",\"SS4/33\":\"reds\",\"SS4/6\":\"brunettes\",\"SS44/60\":\"brunettes\",\"SS613\":\"blondes\",\"SS8/25\":\"brunettes\",\"SS8/29\":\"brunettes\",\"SS9/30\":\"brunettes\",\"Iced-Lavender\":\"fashion-color\",\"RL613SS\":\"blondes\",\"RL10/22SS\":\"brunettes\",\"RL14/25SS\":\"blondes\",\"RL29/33SS\":\"reds\",\"RL4/10SS\":\"brunettes\",\"RL8/12SS\":\"brunettes\",\"RL9/24SS\":\"brunettes\",\"RL17/23SS\":\"blondes\",\"R1\":\"blacks\",\"R16/23\":\"blondes\",\"R23/61\":\"blondes\",\"R4/39\":\"reds\",\"R33/31\":\"reds\",\"R2/6\":\"brunettes\",\"R4/8\":\"brunettes\",\"R12T\":\"brunettes\",\"R12/26H\":\"brunettes\",\"SS16/23\":\"blondes\",\"R14/16T\":\"blondes\",\"SS16\":\"blondes\",\"GREEN\":\"fashion-color\",\"R3025S\":\"brunettes\",\"R12/22\":\"blondes\",\"SS4/10\":\"brunettes\",\"THATS-MY-JAM\":\"reds\",\"R4/10\":\"brunettes\",\"R829S\":\"brunettes\",\"ARCTIC-MELT\":\"fashion-color\",\"POISE-&-BERRY\":\"fashion-color\",\"ITS-ALWAYS-SUNNY\":\"fashion-color\",\"R19/23\":\"blondes\",\"PARTY-ALL-NIGHT\":\"fashion-color\",\"R23/101\":\"blondes\",\"R11S\":\"blondes\",\"DANCE-TILL-DAWN\":\"fashion-color\",\"FIERCE-FIRE\":\"fashion-color\",\"LAVENDER-FROSE\":\"fashion-color\",\"SWEETLY-PINK\":\"fashion-color\",\"SUGARED-PEARL\":\"fashion-color\",\"MANE-FLAME\":\"reds\",\"BLUE-BABE\":\"fashion-color\",\"R44\":\"grays\",\"R33\":\"reds\",\"R61\":\"grays\"}",
  "HIM": "{\"M12/22S\":\"brunettes\",\"M12/22SS\":\"brunettes\",\"M14S\":\"blondes\",\"M17S\":\"blondes\",\"M1S\":\"brunettes\",\"M280S\":\"grays\",\"M34S\":\"grays\",\"M36S\":\"grays\",\"M38S\":\"grays\",\"M3S\":\"brunettes\",\"M44S\":\"grays\",\"M51S\":\"grays\",\"M56S\":\"grays\",\"M5S\":\"brunettes\",\"M7S\":\"brunettes\",\"M120S\":\"grays\"}",
  "Illusions": "{\"130/31\":\"reds\",\"1B\":\"blacks\",\"BLACK\":\"blacks\",\"FUCHSIA\":\"fashion-color\",\"GREEN\":\"fashion-color\",\"HOT-PINK\":\"fashion-color\",\"LIGHT-PINK\":\"fashion-color\",\"ORANGE\":\"fashion-color\",\"PINK\":\"fashion-color\",\"PURPLE\":\"fashion-color\",\"RED\":\"fashion-color\",\"ROYAL-BLUE\":\"fashion-color\",\"TEAL\":\"fashion-color\",\"TINSEL-BLACK\":\"fashion-color\",\"TINSEL-GOLD\":\"fashion-color\",\"TINSEL-PINK\":\"fashion-color\",\"TINSEL-RED\":\"fashion-color\",\"TINSEL-SILVER\":\"fashion-color\",\"WHITE\":\"fashion-color\",\"2\":\"blacks\",\"613\":\"blondes\"}",
  "Jon Renau": "{\"10/22TT\":\"brunettes\",\"10/26TT\":\"brunettes\",\"10/26TTS4\":\"blondes\",\"101/48T\":\"grays\",\"101F48T\":\"grays\",\"102F\":\"blondes\",\"102S8\":\"blondes\",\"104F24B\":\"blondes\",\"10F\":\"brunettes\",\"10H16\":\"brunettes\",\"10H24B\":\"brunettes\",\"12/30BT\":\"brunettes\",\"12FS8\":\"blondes\",\"130/28\":\"reds\",\"130/31\":\"reds\",\"130/4\":\"reds\",\"131T4\":\"reds\",\"131T4S4\":\"reds\",\"14/24\":\"blondes\",\"14/26\":\"blondes\",\"14/26S10\":\"blondes\",\"14/88H\":\"blondes\",\"16/22\":\"blondes\",\"17/101\":\"blondes\",\"18/22\":\"blondes\",\"1B\":\"blacks\",\"1B50\":\"grays\",\"1B60\":\"grays\",\"1B80\":\"grays\",\"1BRH30\":\"blacks\",\"22/16S8\":\"blondes\",\"22F16\":\"blondes\",\"22MB\":\"blondes\",\"22RH613\":\"blondes\",\"24B/27C\":\"blondes\",\"24B/27CS10\":\"blondes\",\"24B18S8\":\"blondes\",\"24B22\":\"blondes\",\"24B22RN\":\"blondes\",\"24B27C\":\"blondes\",\"24B613\":\"blondes\",\"24B613S12\":\"blondes\",\"24BRH18\":\"blondes\",\"24BT18\":\"blondes\",\"24BT18F\":\"brunettes\",\"24BT18S8\":\"blondes\",\"26RH14\":\"blondes\",\"27B\":\"reds\",\"27F613\":\"blondes\",\"27MB\":\"reds\",\"27MBF\":\"reds\",\"27MBTT\":\"reds\",\"27RH613\":\"blondes\",\"27T33B\":\"reds\",\"27T613\":\"blondes\",\"27T613F\":\"blondes\",\"27T613S8\":\"blondes\",\"30A\":\"reds\",\"30A27S4\":\"reds\",\"31/26\":\"reds\",\"32BF\":\"reds\",\"32F\":\"reds\",\"32F102S4\":\"reds\",\"33R27F\":\"reds\",\"33RH27\":\"reds\",\"33RH29\":\"reds\",\"39F38\":\"grays\",\"4/27/30\":\"blondes\",\"4/33\":\"brunettes\",\"4/6\":\"brunettes\",\"48T\":\"grays\",\"4F\":\"brunettes\",\"4RN\":\"brunettes\",\"51F44\":\"grays\",\"54F48\":\"grays\",\"56/51\":\"grays\",\"56F51\":\"grays\",\"6/27TT\":\"brunettes\",\"6/33\":\"brunettes\",\"60B56F\":\"grays\",\"60R\":\"grays\",\"613/102S8\":\"blondes\",\"613F16\":\"blondes\",\"613RN\":\"blondes\",\"6F27\":\"brunettes\",\"6H12\":\"brunettes\",\"6RH12\":\"brunettes\",\"6RN\":\"brunettes\",\"8/30\":\"brunettes\",\"8/32\":\"brunettes\",\"8F16\":\"brunettes\",\"8H14\":\"brunettes\",\"8RH14\":\"brunettes\",\"8RN\":\"brunettes\",\"B8-27/30RO\":\"brunettes\",\"B8/30-14/26RO\":\"blondes\",\"BLACK\":\"blacks\",\"BROWN\":\"brunettes\",\"FS10\":\"brunettes\",\"FS10/16\":\"brunettes\",\"FS12/24B\":\"blondes\",\"FS12/26RN\":\"reds\",\"FS24/32\":\"reds\",\"FS26/31\":\"reds\",\"FS26/31S6\":\"reds\",\"FS27\":\"reds\",\"FS2V/31V\":\"brunettes\",\"FS4/33/30A\":\"brunettes\",\"FS6/30/27\":\"brunettes\",\"FS6/31S6\":\"reds\",\"FS613/24B\":\"blondes\",\"FUSCHIA\":\"fashion-color\",\"LEOPARD\":\"fashion-color\",\"LIGHT-BLUE\":\"fashion-color\",\"LIGHT-PINK\":\"fashion-color\",\"M1\":\"blacks\",\"M10\":\"brunettes\",\"M1020\":\"grays\",\"M12\":\"brunettes\",\"M14\":\"brunettes\",\"M16/22\":\"blondes\",\"M18\":\"brunettes\",\"M1B\":\"blacks\",\"M1B60\":\"grays\",\"M2\":\"blacks\",\"M210\":\"grays\",\"M240\":\"grays\",\"M280\":\"grays\",\"M3\":\"brunettes\",\"M320\":\"grays\",\"M34\":\"brunettes\",\"M38\":\"brunettes\",\"M38/60\":\"grays\",\"M39\":\"grays\",\"M39/38\":\"grays\",\"M4\":\"brunettes\",\"M420\":\"grays\",\"M44\":\"grays\",\"M48\":\"grays\",\"M51\":\"grays\",\"M520\":\"grays\",\"M54\":\"grays\",\"M56\":\"grays\",\"M580\":\"grays\",\"M59\":\"grays\",\"M6\":\"brunettes\",\"M60\":\"grays\",\"M640\":\"grays\",\"M7\":\"brunettes\",\"M720\":\"grays\",\"M740\":\"grays\",\"M8\":\"brunettes\",\"NAVY\":\"fashion-color\",\"PLUM\":\"fashion-color\",\"PURPLE\":\"fashion-color\",\"RED\":\"fashion-color\",\"ROYAL-BLUE\":\"fashion-color\",\"SILVER\":\"grays\",\"TES-BLACK\":\"fashion-color\",\"TES-BLUE-SAGE\":\"fashion-color\",\"TES-MOCHA\":\"fashion-color\",\"TES-NAVY\":\"fashion-color\",\"TES-PINK-SHERBET\":\"fashion-color\",\"TES-PLUM\":\"fashion-color\",\"TES-RASPBERRY\":\"fashion-color\",\"TES-WHITE\":\"fashion-color\",\"TSO-BLACK\":\"fashion-color\",\"TSO-BLUE-SAGE\":\"fashion-color\",\"TSO-CREAM\":\"fashion-color\",\"TSO-MOCHA\":\"fashion-color\",\"TSO-NAVY\":\"fashion-color\",\"TSO-PINK-SHERBET\":\"fashion-color\",\"TSO-PLUM\":\"fashion-color\",\"TSO-RASPBERRY\":\"fashion-color\",\"TSO-WHITE\":\"fashion-color\",\"TSS-BLACK\":\"fashion-color\",\"TSS-BLUE-SAGE\":\"fashion-color\",\"TSS-MOCHA\":\"fashion-color\",\"TSS-NAVY\":\"fashion-color\",\"TSS-PINK-SHERBET\":\"fashion-color\",\"TSS-PLUM\":\"fashion-color\",\"TSS-RASPBERRY\":\"fashion-color\",\"TSS-WHITE\":\"fashion-color\",\"WHITE\":\"fashion-color\",\"1\":\"blacks\",\"2\":\"blacks\",\"3\":\"blacks\",\"4\":\"brunettes\",\"5\":\"brunettes\",\"6\":\"brunettes\",\"7\":\"brunettes\",\"8\":\"brunettes\",\"10\":\"brunettes\",\"12\":\"brunettes\",\"14\":\"blondes\",\"16\":\"blondes\",\"22\":\"blondes\",\"24\":\"blondes\",\"27\":\"reds\",\"33\":\"reds\",\"34\":\"grays\",\"36\":\"grays\",\"38\":\"grays\",\"39\":\"grays\",\"44\":\"grays\",\"48\":\"grays\",\"51\":\"grays\",\"54\":\"grays\",\"56\":\"grays\",\"59\":\"grays\",\"60\":\"grays\",\"92\":\"grays\",\"101\":\"grays\",\"210\":\"grays\",\"240\":\"grays\",\"280\":\"grays\",\"320\":\"grays\",\"350\":\"grays\",\"395\":\"grays\",\"420\":\"grays\",\"520\":\"grays\",\"540\":\"grays\",\"550\":\"grays\",\"580\":\"grays\",\"601\":\"grays\",\"610\":\"grays\",\"613\":\"blondes\",\"720\":\"grays\",\"740\":\"grays\",\"820\":\"grays\",\"1480\":\"grays\",\"1780\":\"grays\",\"2020\":\"grays\",\"12FS12\":\"blondes\",\"22F16S8\":\"blondes\",\"FS24/102S12\":\"blondes\",\"FS17/101S18\":\"blondes\",\"60S18\":\"grays\",\"FS60/PKS18\":\"fashion-color\",\"FS38/PLS8\":\"fashion-color\",\"FS60/BLS6\":\"fashion-color\",\"FS36/56/60S4\":\"grays\",\"24B18\":\"blondes\",\"10RH16\":\"brunettes\",\"FS17/101S8\":\"blondes\",\"CREAM\":\"fashion-color\",\"MOCHA\":\"fashion-color\",\"SKY\":\"fashion-color\",\"DARK-GREY\":\"fashion-color\",\"DARK-SKY\":\"fashion-color\",\"MARQUISE-MULTI\":\"fashion-color\",\"BLOOMS\":\"fashion-color\",\"TAUPE\":\"fashion-color\",\"SOFT-CORAL\":\"fashion-color\",\"AQUA\":\"fashion-color\",\"BLUE-SAGE\":\"fashion-color\",\"SWEET-PEA\":\"fashion-color\",\"RAIN-CHIRPS\":\"fashion-color\",\"SHIFTS\":\"fashion-color\",\"CARIBBEAN\":\"fashion-color\",\"MOMENTS\":\"fashion-color\",\"SNOW-CHIRPS\":\"fashion-color\",\"BRIGHT-ANIMAL\":\"fashion-color\",\"PHASES\":\"fashion-color\",\"GREEN-SAGE\":\"fashion-color\",\"BALLERINA\":\"fashion-color\",\"PINK-SHERBET\":\"fashion-color\",\"MERIDIANS\":\"fashion-color\",\"ECHOES\":\"fashion-color\",\"CITY-LIGHTS\":\"fashion-color\",\"RASPBERRY\":\"fashion-color\",\"ROYAL-CHEETAH\":\"fashion-color\",\"STILETTO-SNAKE\":\"fashion-color\",\"SPIRITUAL-TRAILS\":\"fashion-color\",\"SOWETO-NIGHTS\":\"fashion-color\",\"TOMBI-TALES\":\"fashion-color\",\"S2-103/18RO\":\"brunettes\",\"S6-30A27RO\":\"brunettes\",\"S4-28/32RO\":\"reds\",\"S18-60/102RO\":\"blondes\",\"S8-18/26RO\":\"brunettes\",\"S14-26/88RO\":\"blondes\",\"DARK-BROWN\":\"brunettes\",\"LIGHT-BROWN\":\"brunettes\",\"BLONDE\":\"blondes\",\"39/51/60\":\"grays\",\"12F\":\"blondes\",\"6/8\":\"brunettes\",\"39/38\":\"grays\",\"14/88HH\":\"blondes\",\"1B/60\":\"grays\"}",
  "Kim Kimble": "{\"MC1\":\"blacks\",\"MC119/23SS\":\"blondes\",\"MC11SS\":\"brunettes\",\"MC2/4\":\"blacks\",\"MC25/88SS\":\"blondes\",\"MC30/130SS\":\"reds\",\"MC30/29SS\":\"reds\",\"MC4/10SS\":\"brunettes\",\"MC4/35SS\":\"reds\",\"MC511SS\":\"grays\",\"MC56/60\":\"grays\",\"MC613SS\":\"blondes\",\"MC8/29SS\":\"brunettes\",\"MC9/14SS\":\"blondes\"}",
  "Noriko": "{\"ALMOND SPICE-R\":\"brunettes\",\"ALMOND-ROCKA\":\"brunettes\",\"ALMOND-ROCKA-R\":\"brunettes\",\"ALMOND-SPICE\":\"brunettes\",\"ALMOND-SPICE-R\":\"brunettes\",\"AUBURN-SUGAR-R\":\"brunettes\",\"BANANA-SPLIT-LR\":\"blondes\",\"BLACK-ONYX\":\"grays\",\"BRONZED-BROWN\":\"brunettes\",\"BUBBLEGUM-R\":\"fashion-color\",\"BURGUNDY\":\"reds\",\"BURGUNDY-ROSA\":\"reds\",\"BURNT-SIENNA-R\":\"reds\",\"BUTTER-PECAN-R\":\"blondes\",\"CAPPUCCINO\":\"brunettes\",\"CAPPUCINO\":\"brunettes\",\"CARAMEL-CREAM\":\"blondes\",\"CAYENNE-SPICE-R\":\"reds\",\"CHAMPAGNE\":\"blondes\",\"CHAMPAGNE-R\":\"blondes\",\"CHERRYWOOD\":\"reds\",\"CHESTNUT\":\"brunettes\",\"CHOC-SWIRL\":\"brunettes\",\"CHOCOLATE-FROST-R\":\"brunettes\",\"CHOCOLATE-LAVA\":\"brunettes\",\"CHOCOLATE-SWIRL\":\"brunettes\",\"COCONUT-SPICE\":\"brunettes\",\"COFFEE-LATTE-R\":\"brunettes\",\"COFFEE-LATTEE-R\":\"brunettes\",\"COPPER-GLAZE-R\":\"reds\",\"CREAMY-BLOND\":\"blondes\",\"CREAMY-BLONDE\":\"blondes\",\"CREAMY-TOAST\":\"blondes\",\"CREAMY-TOAST-R\":\"blondes\",\"CREAMY-TOFF-R\":\"blondes\",\"CREAMY-TOFFEE-R\":\"blondes\",\"CRIMSON-LR\":\"reds\",\"DARK-CHOCOLATE\":\"brunettes\",\"DARK-RUST\":\"reds\",\"DK-CHOC\":\"brunettes\",\"EXPRESSO\":\"brunettes\",\"FROSTI-BLONDE\":\"blondes\",\"GARNET-GLAZE\":\"brunettes\",\"GINGER-BRN\":\"brunettes\",\"GINGER-BROWN\":\"brunettes\",\"GINGER-H\":\"brunettes\",\"GOLD-BLONDE\":\"blondes\",\"GOLDEN-BROWN\":\"brunettes\",\"HARVEST-GOLD\":\"brunettes\",\"HONEY-WHEAT-R\":\"brunettes\",\"ICED-MOCHA-R\":\"brunettes\",\"ILLUMINA-R\":\"grays\",\"IRISH-SPICE-R\":\"reds\",\"JAVA-FROST\":\"brunettes\",\"KAHLUA-BLAST\":\"brunettes\",\"LIGHT-CHOCOLATE\":\"brunettes\",\"MACADAMIA-LR\":\"brunettes\",\"MAPLE-SUGA-R\":\"brunettes\",\"MAPLE-SUGAR-R\":\"brunettes\",\"MARBLE-BRN\":\"brunettes\",\"MARBLE-BROWN\":\"brunettes\",\"MARBLE-BROWN-R\":\"brunettes\",\"MEDIUM-BROWN\":\"brunettes\",\"MIDNIGHT-PEARL\":\"grays\",\"MIDNITE-PEARL\":\"grays\",\"MOCHA-H\":\"blondes\",\"MOCHACCINO-R\":\"brunettes\",\"NUTMEG-F\":\"blondes\",\"NUTMEG-R\":\"blondes\",\"PAPRIKA-R\":\"reds\",\"PECAN-BROWN\":\"brunettes\",\"PLATINUM-PEARL\":\"blondes\",\"PLUMBERRY-JAM-LR\":\"fashion-color\",\"PLUMBERRY-JAM-R\":\"fashion-color\",\"RAISIN-GLAZE-H\":\"brunettes\",\"RAISIN-GLAZE-R\":\"reds\",\"RAZBERRY-ICE-R\":\"reds\",\"RAZBRY-ICE-R\":\"reds\",\"RED-PEPPER\":\"reds\",\"SANDALWOOD-H\":\"blondes\",\"SANDY-SILVER\":\"grays\",\"SILVER-STONE\":\"grays\",\"SPRING-HONEY\":\"blondes\",\"SPRING-HONEY-R\":\"blondes\",\"STRAW-SWIRL\":\"blondes\",\"STRAWBERRY-SWIRL\":\"blondes\",\"SUGAR-CANE-R\":\"blondes\",\"SUNNY-BLONDE\":\"blondes\",\"TERRACOTTA-H\":\"brunettes\",\"TOASTED-BRN\":\"brunettes\",\"TOASTED-BROWN\":\"brunettes\",\"VANILLA-LUSH\":\"blondes\",\"RED-COPPER\":\"reds\",\"MELTED-PLUM\":\"fashion-color\",\"LAVENDER-BLUSH\":\"fashion-color\",\"WHIPPED-BERRY\":\"fashion-color\",\"SEAGLASS-R\":\"fashion-color\",\"MELTED-SUNRISE\":\"fashion-color\",\"RED-BROWN\":\"reds\",\"PEACH-GOLD\":\"blondes\",\"SIMPLY-WHITE\":\"grays\",\"KANDY-BROWN-LR\":\"brunettes\",\"MOONSTONE\":\"grays\",\"DEEP-SMOKY-BROWN\":\"brunettes\",\"COFFEE-LATTE\":\"brunettes\",\"SUGAR-CANE\":\"blondes\",\"FROSTI-BLOND\":\"blondes\",\"MARBLE-BROWN-LR\":\"brunettes\",\"MOCHACCINO-LR\":\"brunettes\",\"MELTED-MARSHMALLOW\":\"blondes\",\"HONEY-BROWN-R\":\"brunettes\",\"MULBERRY-BROWN\":\"brunettes\",\"SMOKY-GRAY-R\":\"grays\",\"CREAMY-TOFFEE-LR\":\"blondes\",\"LAVENDER-BLUSH-R\":\"fashion-color\",\"MANGO-SUNRISE\":\"fashion-color\",\"MOCHA-HIGHLIGHT\":\"blondes\",\"BANANNA-SPLIT-LR\":\"blondes\",\"SEASHELL-BLOND-R\":\"blondes\",\"DESERT-SAND-R\":\"blondes\",\"SILVER-STONE-R\":\"grays\",\"MELTED-COCONUT\":\"brunettes\",\"MILK-TEA-LR\":\"blondes\",\"ROSE-GOLD-R\":\"blondes\",\"SPRING-HONEY-T\":\"blondes\",\"MELTED-CINNAMON\":\"brunettes\",\"ICY-CAVIAR\":\"brunettes\",\"LILAC-SILVER-R\":\"fashion-color\",\"AUBURN-SUGAR\":\"blondes\",\"BROWN-SABLE\":\"brunettes\",\"MELTED-MARSHMELLOW\":\"blondes\",\"SILVER-MINK\":\"grays\",\"MILKY-OPAL-R\":\"blondes\",\"ICE-BLOND\":\"blondes\",\"CREAMY-TOFFEE\":\"blondes\",\"CASHMERE-BROWN-SR\":\"blondes\",\"MOCHACCINO\":\"blondes\",\"SILVERSTONE\":\"grays\",\"60\":\"grays\",\"ICED-MOCHA\":\"blondes\",\"SILVERSTONE-R\":\"grays\",\"CHAMPAGNE-SILVER\":\"grays\",\"SANDY-SALT\":\"brunettes\",\"FROSTED-MUSHROOM-R\":\"brunettes\",\"SPARKLING-MOCHA-R\":\"brunettes\",\"SPICED-BROWN\":\"brunettes\",\"ARABIAN-SAND\":\"exclusive-color\"}",
  "Raquel Welch": "{\"BL1\":\"brunettes\",\"BL10\":\"blondes\",\"BL2\":\"brunettes\",\"BL3\":\"brunettes\",\"BL4\":\"brunettes\",\"BL5\":\"brunettes\",\"BL6\":\"brunettes\",\"BL7\":\"blondes\",\"BL8\":\"blondes\",\"BL9\":\"blondes\",\"R10\":\"brunettes\",\"R1020\":\"brunettes\",\"R10HH\":\"blondes\",\"R119G\":\"grays\",\"R11S\":\"brunettes\",\"R11S+\":\"brunettes\",\"R11S/R11S+\":\"brunettes\",\"R12/26H\":\"brunettes\",\"R12T\":\"brunettes\",\"R130\":\"reds\",\"R135\":\"reds\",\"R13F25\":\"blondes\",\"R14/25\":\"blondes\",\"R14/88\":\"blondes\",\"R14/88H\":\"blondes\",\"R1416T\":\"blondes\",\"R1425\":\"blondes\",\"R1621S\":\"blondes\",\"R1621S+\":\"blondes\",\"R1621S/R1621S+\":\"blondes\",\"R1HH\":\"brunettes\",\"R2\":\"brunettes\",\"R2/31\":\"brunettes\",\"R2026S\":\"blondes\",\"R21T\":\"blondes\",\"R22\":\"blondes\",\"R23S\":\"blondes\",\"R23S+\":\"blondes\",\"R25\":\"blondes\",\"R28S\":\"reds\",\"R28S+\":\"reds\",\"R28S/R28S+\":\"reds\",\"R29S\":\"reds\",\"R29S+\":\"reds\",\"R29S/R29S+\":\"reds\",\"R30\":\"reds\",\"R3025S\":\"reds\",\"R3025S+\":\"reds\",\"R3025S/R3025S+\":\"reds\",\"R32/31\":\"reds\",\"R33\":\"reds\",\"R3329S\":\"reds\",\"R3329S+\":\"reds\",\"R38\":\"grays\",\"R388G\":\"grays\",\"R3HH\":\"brunettes\",\"R4\":\"brunettes\",\"R44\":\"grays\",\"R48\":\"grays\",\"R4HH\":\"brunettes\",\"R511G\":\"grays\",\"R56\":\"grays\",\"R56/50\":\"grays\",\"R56/60\":\"grays\",\"R5HH\":\"brunettes\",\"R6\":\"brunettes\",\"R6/28H\":\"brunettes\",\"R6/30H\":\"brunettes\",\"R60\":\"grays\",\"R61\":\"grays\",\"R6HH\":\"reds\",\"R7HH\":\"blondes\",\"R8\":\"brunettes\",\"R8/25\":\"brunettes\",\"R829S\":\"brunettes\",\"R829S+\":\"brunettes\",\"R829S/R829S+\":\"brunettes\",\"R830\":\"brunettes\",\"R8HH\":\"blondes\",\"R9F26\":\"brunettes\",\"R9HH\":\"blondes\",\"R9S\":\"brunettes\",\"R9S+\":\"brunettes\",\"RL10/12\":\"brunettes\",\"RL11/25\":\"brunettes\",\"RL119\":\"grays\",\"RL12/16\":\"brunettes\",\"RL12/22SS\":\"blondes\",\"RL13/88\":\"blondes\",\"RL14/22\":\"blondes\",\"RL14/22SS\":\"blondes\",\"RL14/25\":\"blondes\",\"RL16/88\":\"blondes\",\"RL19/23\":\"blondes\",\"RL19/23SS\":\"blondes\",\"RL2/4\":\"brunettes\",\"RL25/27\":\"reds\",\"RL29/25\":\"reds\",\"RL30/27\":\"reds\",\"RL31/29\":\"reds\",\"RL32/31\":\"reds\",\"RL33/35\":\"reds\",\"RL38\":\"grays\",\"RL4/6\":\"brunettes\",\"RL5/27\":\"brunettes\",\"RL511\":\"grays\",\"RL51/61\":\"grays\",\"RL56/60\":\"grays\",\"RL6/28\":\"brunettes\",\"RL6/30\":\"brunettes\",\"RL6/8\":\"brunettes\",\"RL8/29\":\"brunettes\",\"RL8/29SS\":\"brunettes\",\"SS10\":\"brunettes\",\"SS10/16\":\"brunettes\",\"SS11/29\":\"brunettes\",\"SS12/20\":\"brunettes\",\"SS12/22\":\"blondes\",\"SS130\":\"reds\",\"SS14/22\":\"blondes\",\"SS14/25\":\"blondes\",\"SS14/88\":\"blondes\",\"SS15/24\":\"blondes\",\"SS19/23\":\"blondes\",\"SS23\":\"blondes\",\"SS23/61\":\"blondes\",\"SS26\":\"blondes\",\"SS29\":\"reds\",\"SS29/20\":\"reds\",\"SS30/28\":\"reds\",\"SS4/33\":\"reds\",\"SS4/6\":\"brunettes\",\"SS44/60\":\"brunettes\",\"SS613\":\"blondes\",\"SS8/25\":\"brunettes\",\"SS8/29\":\"brunettes\",\"SS9/30\":\"brunettes\",\"Iced-Lavender\":\"fashion-color\",\"RL613SS\":\"blondes\",\"RL10/22SS\":\"brunettes\",\"RL14/25SS\":\"blondes\",\"RL29/33SS\":\"reds\",\"RL4/10SS\":\"brunettes\",\"RL8/12SS\":\"brunettes\",\"RL9/24SS\":\"brunettes\",\"RL17/23SS\":\"blondes\",\"R101\":\"grays\",\"R16\":\"blondes\",\"R51/61\":\"grays\",\"RL16/21SS\":\"blondes\",\"SS4/10\":\"brunettes\",\"SS10/22\":\"brunettes\",\"SS9/24\":\"brunettes\",\"SS17/23\":\"blondes\",\"SS29/33\":\"reds\",\"SS8/12\":\"brunettes\",\"RL16/22\":\"blondes\",\"R16/22\":\"blondes\",\"RL16/22SS\":\"blondes\",\"RL119G\":\"grays\",\"RL19/23 \":\"blondes\",\"RL56/50\":\"grays\",\"10/22SS\":\"brunettes\",\"17/23SS\":\"blondes\",\"29/33SS\":\"reds\",\"4/10SS\":\"brunettes\",\"8/12SS\":\"brunettes\",\"9/24SS\":\"brunettes\",\"PINK\":\"fashion-color\",\"RL1621SS\":\"blondes\",\"SS16/21\":\"blondes\",\"RL1\":\"blacks\",\"RL2/31OM\":\"reds\",\"R1\":\"blacks\",\"RL11/25SS\":\"blondes\",\"RL8/24OM\":\"blondes\",\"R1621SS\":\"blondes\",\"RL4/15OM\":\"blondes\"}",
  "Rene of Paris": "{\"60\":\"grays\",\"ALMOND-ROCKA\":\"brunettes\",\"ALMOND-ROCKA-R\":\"brunettes\",\"ALMOND-SPICE-R\":\"brunettes\",\"APRICOT-FROST\":\"reds\",\"AQUA-PARADISE\":\"fashion-color\",\"AUBURN-SUGAR\":\"reds\",\"AUBURN-SUGAR-R\":\"brunettes\",\"BANANA-SPLIT\":\"blondes\",\"BANANA-SPLIT-LR\":\"blondes\",\"BLACK\":\"brunettes\",\"BLONDE-AMBITION\":\"blondes\",\"BURGUNDY-ROSA\":\"reds\",\"BURNT-CHILI\":\"reds\",\"BUTTER-PECAN\":\"blondes\",\"BUTTER-PECAN-R\":\"blondes\",\"BUTTERED-TOAST\":\"blondes\",\"CAFE-OLE\":\"brunettes\",\"CAPPUCCINO\":\"brunettes\",\"CAPPUCINO\":\"brunettes\",\"CARAMEL-BROWN\":\"brunettes\",\"CARAMEL-CREAM\":\"blondes\",\"CAYANNE-SPICE\":\"reds\",\"CHAI-CREAM\":\"brunettes\",\"CHAMPAGNE-BLUSH\":\"blondes\",\"CHAMPAGNE-R\":\"blondes\",\"CHERRY-COLA\":\"reds\",\"CHESTNUT\":\"reds\",\"CHOCOLATE-FROST\":\"brunettes\",\"CHOCOLATE-FROST-R\":\"brunettes\",\"CHOCOLATE-SWIRL\":\"brunettes\",\"CINNAMON-SWIRL\":\"reds\",\"COCO-CREAM\":\"blondes\",\"COCONUT-SPICE\":\"reds\",\"COFFEE-LATTE\":\"brunettes\",\"COFFEE-LATTE-R\":\"brunettes\",\"COPPER-GLAZE\":\"reds\",\"CREME-DE-COCO\":\"blondes\",\"CREAMY-BLONDE\":\"blondes\",\"CREAMY-TOFFEE\":\"blondes\",\"CREAMY-TOFFEE-LR\":\"blondes\",\"CREAMY-TOFFEE-R\":\"blondes\",\"CRÈME-BRULEE\":\"blondes\",\"CRIMSON-LR\":\"reds\",\"DARK-CHOCOLATE\":\"brunettes\",\"EXPRESSO\":\"brunettes\",\"FROSTI-BLONDE\":\"blondes\",\"FUDGE-RIPPLE\":\"brunettes\",\"GARNET-GLAZE\":\"brunettes\",\"GINGER-BROWN\":\"brunettes\",\"GINGER-H\":\"brunettes\",\"GINGER-SNAP\":\"reds\",\"GOLD-BLONDE\":\"blondes\",\"HARVEST-GOLD\":\"brunettes\",\"HONEY-WHEAT\":\"brunettes\",\"HONEY-WHEAT-R\":\"brunettes\",\"HONEYCOMB-BROWN\":\"brunettes\",\"HOT-CHOCOLATE\":\"brunettes\",\"ICE-BLOND\":\"blondes\",\"ICED-MOCHA\":\"brunettes\",\"ICED-MOCHA-R\":\"brunettes\",\"ILLUMINA-R\":\"grays\",\"IRISH-SPICE\":\"reds\",\"JAVA-BLAST\":\"brunettes\",\"JAVA-FROST\":\"brunettes\",\"LIGHT-CHOCOLATE\":\"brunettes\",\"MACADAMIA-LR\":\"brunettes\",\"MAPLE-SUGAR\":\"brunettes\",\"MAPLE-SUGAR-R\":\"brunettes\",\"MARBLE BROWN R\":\"brunettes\",\"MARBLE-BROWN\":\"brunettes\",\"MARBLE-BROWN-LR\":\"brunettes\",\"MARBLE-BROWN-R\":\"brunettes\",\"MEDIUM-BROWN\":\"brunettes\",\"MELTED-MARSHMALLOW\":\"blondes\",\"MELTED-OCEAN\":\"fashion-color\",\"MELTED-SUNSET\":\"blondes\",\"MIDNIGHT-IRIS\":\"fashion-color\",\"MIDNIGHT-PEARL\":\"grays\",\"MIDNITE-PEARL\":\"grays\",\"MILK-TEA-LR\":\"blondes\",\"MOCHA-BROWN\":\"brunettes\",\"MOCHACCINO\":\"brunettes\",\"MOCHACCINO-LR\":\"brunettes\",\"MOCHACCINO-R\":\"brunettes\",\"MOLTEN-AMBER\":\"brunettes\",\"NOCTURNAL\":\"brunettes\",\"NUTMEG-F\":\"blondes\",\"NUTMEG-R\":\"blondes\",\"PASTEL-BLUE-R\":\"fashion-color\",\"PASTEL-PINK\":\"grays\",\"PASTEL-RAINBOW-R\":\"fashion-color\",\"PECAN\":\"brunettes\",\"PLATINUM-PEARL\":\"grays\",\"PLUM-DANDY\":\"fashion-color\",\"PLUMBERRY-JAM\":\"fashion-color\",\"PLUMBERRY-JAM-LR\":\"fashion-color\",\"PRALINES-&-CREAM\":\"brunettes\",\"RAZBERRY-ICE\":\"reds\",\"RAZBERRY-ICE-R\":\"reds\",\"RED-PEPPER\":\"reds\",\"ROSE-GOLD\":\"blondes\",\"ROSE-GOLD-R\":\"blondes\",\"RUM-RAISIN\":\"reds\",\"RUSTY-RED\":\"reds\",\"SANDY-SILVER\":\"grays\",\"SEPIA\":\"brunettes\",\"SILVER-MIST\":\"fashion-color\",\"SILVER-STONE\":\"grays\",\"SILVER-STONE R\":\"grays\",\"SILVERSTONE\":\"grays\",\"SMOKY-GRAY-R\":\"grays\",\"SPRING-HONEY\":\"blondes\",\"SPRING-HONEY-R\":\"blondes\",\"STRAWBERRY-SWIRL\":\"blondes\",\"SUGAR-CANE\":\"blondes\",\"SUGAR-CANE-R\":\"blondes\",\"SUGAR-COOKIE\":\"blondes\",\"SUNKISS\":\"blondes\",\"SUNNY-SPICE\":\"blondes\",\"TOASTED-BROWN\":\"brunettes\",\"TOASTED-SHINE\":\"blondes\",\"TOMATO-BISQUE\":\"reds\",\"VANILLA-BEAN\":\"blondes\",\"VANILLA-LUSH\":\"blondes\",\"WALNUT\":\"brunettes\",\"CHOCOLATE-PRETZEL\":\"brunettes\",\"SANDY-MINK\":\"brunettes\",\"BROWN-SUGAR\":\"brunettes\",\"CREAMY-DOLCE\":\"blondes\",\"MOONSTONE\":\"grays\",\"PEANUT-BUTTER-SWIRL\":\"brunettes\",\"SILVER-FROST\":\"grays\",\"SHADOWED-CUSTARD\":\"blondes\",\"CAFE-MACCHIATO\":\"blondes\",\"SHADED-AMBER\":\"reds\",\"COFFEE-BEAN\":\"brunettes\",\"DUSTY-ROSE\":\"fashion-color\",\"FROZEN-SAPPHIRE\":\"fashion-color\",\"LUNAR-HAZE\":\"fashion-color\",\"SMOKY-FOREST\":\"fashion-color\",\"COSMIC-TEAL\":\"fashion-color\",\"LILAC-CLOUD\":\"fashion-color\",\"MIDNIGHT-STONE\":\"fashion-color\",\"POLAR-SKY\":\"fashion-color\",\"WATERMELON-R\":\"fashion-color\",\"MELTED-COCONUT\":\"brunettes\",\"SNOWY-SAPPHIRE-R\":\"grays\",\"KANDY-BROWN-LR\":\"brunettes\",\"RED-BROWN\":\"reds\",\"PEACH-GOLD\":\"blondes\",\"SPRING-HONEY-T\":\"blondes\",\"ICE-BLONDE\":\"blondes\",\"PLUMBERRY-JAM-R\":\"fashion-color\",\"ICE-MOCHA-R\":\"brunettes\",\"PRALINE-&-CREAM\":\"brunettes\",\"CREAMY-BLOND\":\"blondes\",\"SPRING-HONEY-LR\":\"blondes\",\"RAZBERRY-ICE-LR\":\"reds\",\"MELTED-PLUM\":\"fashion-color\",\"CANYON-STONE\":\"grays\",\"CREAM-VELVET\":\"blondes\",\"CAFFE-MACCHIATO\":\"brunettes\",\"GRAPE-BURST\":\"fashion-color\",\"ICY-PETAL\":\"fashion-color\",\"MAPLE-FROST\":\"brunettes\",\"MILKY-OPAL-R\":\"blondes\",\"DESERT-SAND-R\":\"blondes\",\"SEASHELL-BLOND-R\":\"blondes\",\"HONEY-BROWN-R\":\"brunettes\",\"SILVER-STONE-R\":\"grays\",\"SMOKE-IVORY\":\"grays\",\"BUBBLEGUM-R\":\"fashion-color\",\"MOCHA-TRUFFLE\":\"blondes\",\"SATIN-PEARL\":\"blondes\",\"CHERRY-MERLOT\":\"reds\",\"COFFEE-NOIR\":\"brunettes\",\"ALMOND-TOAST\":\"brunettes\",\"SUNLIT-SAND\":\"blondes\",\"MARIGOLD\":\"blondes\",\"ICY-OAK-SR\":\"brunettes\",\"BRONZE-HAZELNUT-R\":\"brunettes\",\"SUMMER-BLOND\":\"blondes\",\"STRAWBERRY-BLOND\":\"blondes\",\"SANDY-BLOND-R\":\"blondes\",\"ASHEN-CREAM\":\"blondes\",\"AUTUMN-TEAK\":\"reds\",\"BEIGE-BROWN\":\"brunettes\",\"COCO-BROWN\":\"brunettes\",\"SALT-&-PEPPER-MR\":\"grays\",\"SILVER-BROWN-MR\":\"grays\",\"CINDER-TOFFEE\":\"blondes\",\"HENNA-RED-R\":\"reds\",\"SALT-&-PEPPER\":\"grays\",\"FROZEN-MULBERRY\":\"fashion-color\",\"CARAMEL-BISCOTTI\":\"blondes\",\"MAUVE-BERRY\":\"fashion-color\",\"WHITE-ROSE-BLOND-R\":\"blondes\",\"TRUFFLE-BROWN-R\":\"brunettes\",\"AUTUMN-SUNRISE\":\"brunettes\",\"BUTTERCREAM-BLONDE\":\"blondes\",\"CARAMEL-SWIRL\":\"brunettes\",\"CINDER-TOFFEE-R\":\"blondes\",\"GOLDEN-TRUFFLE-BLOND\":\"blondes\",\"SNOWY-PEACH\":\"blondes\",\"GHOST-BLOND\":\"blondes\",\"RUBY-CHOCOLATE\":\"brunettes\",\"SLATE-CHOCOLATE-SPLIT\":\"grays\",\"MELTED-CINNAMON\":\"brunettes\",\"BROWN-SABLE\":\"brunettes\",\"MELTED-MARSHMELLOW\":\"blondes\",\"BRONZE-HAZLENUT-R\":\"blondes\",\"SALT-&-PEPPER-R\":\"grays\",\"ICY-CAVIAR\":\"blacks\",\"SILVER-MINK\":\"grays\",\"LILAC-SILVER-R\":\"grays\",\"CRIMSON-R\":\"reds\",\"IRISH-SPICE-R\":\"reds\",\"TRUFFLE-BROWN-LR\":\"brunettes\",\"CASHMERE-BROWN-SR\":\"blondes\",\"DARK-RUST\":\"reds\",\"BUTTERCREAM-BLOND\":\"blondes\",\"PINK-CHAMPAGNE\":\"fashion-color\",\"SNOWY-UMBER-R\":\"brunettes\",\"SILVER-OYSTER-R\":\"blondes\",\"TRE-CHOCOLATE-R\":\"brunettes\",\"TRUFFLE-RIBBON-R\":\"brunettes\"}",
  "TressAllure": "{\"1\":\"blacks\",\"1B/BURG\":\"reds\",\"10R\":\"brunettes\",\"12R\":\"brunettes\",\"2/4R\":\"brunettes\",\"24/18T\":\"blondes\",\"4/6R\":\"brunettes\",\"Color 6/28\":\"brunettes\",\"8R\":\"brunettes\",\"747T\":\"brunettes\",\"10/130R\":\"reds\",\"27/30/33H\":\"reds\",\"32/31\":\"reds\",\"33/30\":\"reds\",\"14/26/10\":\"blondes\",\"22R\":\"blondes\",\"223/23C\":\"blondes\",\"23R\":\"blondes\",\"24/102/R12\":\"blondes\",\"88\":\"grays\",\"44/56/60\":\"grays\",\"38/51/60\":\"grays\",\"1001\":\"grays\",\"60R\":\"grays\",\"BLUE-WHITE\":\"fashion-color\",\"PINK-WHITE\":\"fashion-color\",\"CHAMPAGNE\":\"blondes\",\"CHERRYWOOD-HL\":\"reds\",\"CHIFFON-CANDY\":\"blondes\",\"CHOCOLATE-SWIRL\":\"brunettes\",\"COCOA-BEAN\":\"brunettes\",\"MIDNIGHT-COFFEE\":\"brunettes\",\"VELVET-CREAM\":\"blondes\",\"FROSTY-BLONDE-HL\":\"blondes\",\"PRINCESS-IVORY\":\"blondes\",\"MIMOSA-HL\":\"blondes\",\"MISTY-SUNRISE\":\"blondes\",\"PECAN-TWIST\":\"brunettes\",\"SHEER-PLUM\":\"reds\",\"SILKY-SAND\":\"blondes\",\"DEEP-SEPIA\":\"brunettes\",\"SILVER-SHADOW\":\"grays\",\"SUGAR-BRULEE\":\"reds\",\"SUNSET-GLOW\":\"reds\",\"ENGLISH-TEA-HL\":\"brunettes\",\"SILVER-TWILIGHT\":\"grays\",\"WALNUT-BROWN\":\"brunettes\",\"DARK-AMBER-HL\":\"reds\",\"COLA-SWIRL\":\"brunettes\",\"MOCHA-GOLD\":\"brunettes\",\"SATIN-GOLD\":\"blondes\",\"14/26/R10\":\"blondes\",\"HONEY-BEAN\":\"brunettes\",\"DEEP-FOREST\":\"brunettes\",\"CHAMPAGNE-HL\":\"blondes\",\"SILVER-MINK\":\"grays\",\"ICED-SILVER\":\"grays\",\"SILVER-FOX\":\"grays\",\"1B\":\"blacks\",\"2\":\"brunettes\",\"3\":\"brunettes\",\"4\":\"brunettes\",\"6\":\"brunettes\",\"8/6\":\"brunettes\",\"33\":\"brunettes\",\"30/33\":\"reds\",\"32\":\"reds\",\"30\":\"reds\",\"29\":\"reds\",\"27\":\"reds\",\"27/33\":\"reds\",\"12/8\":\"brunettes\",\"12\":\"brunettes\",\"14\":\"blondes\",\"14/10\":\"brunettes\",\"20/10\":\"brunettes\",\"829\":\"brunettes\",\"6/27\":\"reds\",\"6/25\":\"brunettes\",\"29S\":\"blondes\",\"825\":\"brunettes\",\"1425\":\"blondes\",\"23/12\":\"blondes\",\"24/17\":\"blondes\",\"26/10\":\"blondes\",\"1020\":\"brunettes\",\"14014\":\"blondes\",\"16\":\"blondes\",\"1621\":\"blondes\",\"14016\":\"blondes\",\"14/88\":\"blondes\",\"24/613\":\"blondes\",\"24/102\":\"blondes\",\"92\":\"grays\",\"5659\":\"grays\",\"3436\":\"grays\",\"4456\":\"grays\",\"60\":\"grays\",\"12/24TR\":\"blondes\",\"14/26R\":\"blondes\",\"27R\":\"reds\",\"234R\":\"blondes\",\"234/23C\":\"blondes\",\"33R\":\"reds\",\"17/23/R8\":\"blondes\",\"33/32/R4\":\"reds\",\"52/38/49/R8\":\"grays\",\"DARK-SMOKE-GREY\":\"grays\",\"33/130/R4\":\"reds\",\"6/28\":\"brunettes\",\"56/60/R8\":\"grays\",\"27/25/88\":\"blondes\",\"613/1001/R8\":\"blondes\",\"SUNLIGHT-BLONDE-R\":\"blondes\",\"BLUSH-BLONDE-R\":\"blondes\",\"SATIN-BLONDE-R\":\"blondes\",\"SNOW-GREY-R\":\"grays\",\"8/29H\":\"brunettes\",\"613/1001/R18\":\"blondes\",\"EL12/22/8\":\"blondes\",\"EL27/25/88\":\"blondes\",\"SSB2/4\":\"brunettes\",\"SSB6/33/4\":\"brunettes\",\"SSB6/31/830\":\"brunettes\",\"SSB8/12/16/27\":\"brunettes\",\"SSB16-10/R10\":\"blondes\",\"SSB20/26/27/R6-20\":\"blondes\",\"SSB12/22/R10\":\"blondes\",\"SS17/23/R8\":\"blondes\",\"SS14/26/R10\":\"brunettes\",\"SS613/1001/R18\":\"blondes\",\"SS24/102/R12\":\"blondes\",\"SS33/32/R4\":\"reds\",\"SSB27/25/88\":\"blondes\"}",
  "Wig Pro": "{\"1\":\"brunettes\",\"01B\":\"brunettes\",\"01B/2\":\"brunettes\",\"01BGR\":\"brunettes\",\"2\":\"brunettes\",\"02-01\":\"brunettes\",\"02-04\":\"brunettes\",\"02-06\":\"blondes\",\"02-07\":\"blondes\",\"02-08\":\"blondes\",\"02/04GR\":\"brunettes\",\"4\":\"brunettes\",\"04GR\":\"brunettes\",\"6\":\"brunettes\",\"06/10T\":\"brunettes\",\"06/30T\":\"brunettes\",\"06GR\":\"brunettes\",\"8\":\"brunettes\",\"08/14T\":\"brunettes\",\"08/27T\":\"brunettes\",\"08GR\":\"brunettes\",\"10/12\":\"brunettes\",\"10/14T\":\"brunettes\",\"10/16\":\"brunettes\",\"10GR\":\"brunettes\",\"12/27\":\"brunettes\",\"12GR\":\"brunettes\",\"12HL06\":\"brunettes\",\"14/16T\":\"blondes\",\"14/22\":\"blondes\",\"14/24\":\"blondes\",\"14/27A\":\"blondes\",\"14/27T\":\"blondes\",\"14GR\":\"brunettes\",\"14HL08\":\"brunettes\",\"16/22\":\"blondes\",\"16/613\":\"blondes\",\"16GR\":\"blondes\",\"16HL10\":\"blondes\",\"18/22\":\"blondes\",\"18/24T\":\"blondes\",\"18B/24T\":\"blondes\",\"1B\":\"brunettes\",\"1B/30\":\"brunettes\",\"1B10\":\"brunettes\",\"2-1\":\"brunettes\",\"2-4\":\"brunettes\",\"2-6\":\"blondes\",\"2-7\":\"blondes\",\"2-8\":\"blondes\",\"22GR\":\"blondes\",\"24B/18T\":\"blondes\",\"24GR\":\"blondes\",\"25T\":\"blondes\",\"27/613\":\"reds\",\"27GR\":\"reds\",\"28/130\":\"reds\",\"29T\":\"reds\",\"30/27T\":\"reds\",\"30A\":\"reds\",\"30GR\":\"reds\",\"31/130\":\"reds\",\"32/130\":\"reds\",\"33B/27T\":\"reds\",\"33GR\":\"reds\",\"4/16/27HL\":\"brunettes\",\"4/6/8/33\":\"brunettes\",\"6/10T\":\"brunettes\",\"6/28F\":\"brunettes\",\"6/30\":\"brunettes\",\"6/30T\":\"brunettes\",\"613GR\":\"blondes\",\"8/12\":\"brunettes\",\"88R\":\"blondes\",\"9-TONES\":\"blondes\",\"9/123\":\"brunettes\",\"BUTTERSCOTCH\":\"blondes\",\"CAMEL-BROWN\":\"brunettes\",\"CARMEL-BROWN\":\"brunettes\",\"CHAMPAGNE-CREAM\":\"blondes\",\"CHAMPAIGN\":\"blondes\",\"FLAME\":\"reds\",\"GINGER-BROWN\":\"brunettes\",\"GOLD-BLONDE\":\"blondes\",\"GOLDEN-BLONDE\":\"blondes\",\"GOLDEN-BROWN\":\"blondes\",\"GOLDEN-MINK\":\"blondes\",\"HARVEST-RICH\":\"brunettes\",\"OPUS-ONE\":\"reds\",\"PINE-CONE\":\"reds\",\"PLATINUM\":\"blondes\",\"PLUM\":\"reds\",\"ROCKY-ROAD\":\"reds\",\"ROCKY-ROAD-II\":\"brunettes\",\"SUMMER-FEVER\":\"blondes\",\"SWEDISH-ALMOND\":\"blondes\",\"VANILLA-CREAM\":\"blondes\",\"VANILLA-LUSH\":\"blondes\",\"WHITE-FOX\":\"grays\",\"WILD-FIRE\":\"reds\",\"10\":\"brunettes\",\"12\":\"brunettes\",\"14\":\"blondes\",\"16\":\"blondes\",\"22\":\"blondes\",\"23\":\"blondes\",\"24\":\"blondes\",\"27\":\"reds\",\"30\":\"reds\",\"33\":\"reds\",\"34\":\"grays\",\"36\":\"grays\",\"37\":\"grays\",\"38\":\"brunettes\",\"44\":\"grays\",\"48\":\"grays\",\"51\":\"grays\",\"56\":\"grays\",\"60\":\"grays\",\"92\":\"grays\",\"101\":\"blondes\",\"280\":\"grays\",\"310\":\"brunettes\",\"613\":\"blondes\",\"10-16\":\"brunettes\",\"9TONES\":\"brunettes\",\"18-22\":\"blondes\",\"24B-18T\":\"blondes\",\"16-613\":\"blondes\",\"14-88A\":\"blondes\",\"32-130\":\"reds\",\"8-29-R2\":\"brunettes\",\"12-R8\":\"blondes\",\"14-16-R8\":\"blondes\",\"22-1001-R8\":\"blondes\",\"23-60-R8\":\"blondes\",\"27-80-R8\":\"blondes\",\"8-10-88H\":\"brunettes\",\"04\":\"brunettes\",\"8-26-80-HS12\":\"blondes\",\"12-HS8\":\"brunettes\",\"08\":\"brunettes\",\"02\":\"brunettes\",\"06\":\"brunettes\",\"01\":\"blacks\",\"02/04\":\"brunettes\",\"02-8\":\"blondes\",\"02-6\":\"blondes\",\"02-1\":\"brunettes\",\"02-7\":\"blondes\",\"02-4\":\"brunettes\"}"
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
    case Action.DeleteVendorColor:
      return await deleteVendorColor(data.vendorName, data.color);
    case Action.StageColorImage:
      const stagedTargetResponse = await stageColorImage(admin.graphql, JSON.parse(data.file));

      return ({...stagedTargetResponse, color: data.color, altText: data.altText});
    case Action.UploadColorImage:
      return await uploadColorImage(admin.graphql, data.resourceUrl, data.color, data.altText, shop);
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
    case Action.UploadVendorColorBulk:
      return await createManyVendorColors(JSON.parse(data.bulkVendorColors));
  }

  return Response.json({ errors: ['Invalid data passed.'] }, { status: 422 });
}

export default function ColorGroups() {
  const submit = useSubmit();

  const [vendors, setVendors] = useState<Vendor[]>(useLoaderData<Vendor[]>() ?? []);
  const [selected, setSelected] = useState(0);
  const [openMoreActions, setMoreActions] = useState(false);
  const [loadingSyncAltText, setLoadingSyncAltText] = useState(false);

  const vendorTabs = useMemo(() => vendors?.length ? vendors.map((vendor) => vendor.name) : [], [vendors]);
  const currentVendor = useMemo(() => vendors[selected], [vendors, selected]);

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  /* MUTATE VENDORS */

  const onCreateVendor = useCallback(async (value: string) => {
    await sleep(500);

    submit({
      actionType: Action.CreateVendor,
      vendorName: value
    }, { method: "POST" });

    setVendors((prev) => [...prev, { name: value, colors: [] }]);

    return true;
  }, []);

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
  }, [currentVendor]);

  const onDeleteVendor = useCallback(async () => {
    await sleep(1);

    submit({
      actionType: Action.DeleteVendor,
      vendorName: currentVendor.name
    }, { method: "DELETE" });

    setVendors((prev) => prev.filter((vendor) => vendor.name !== currentVendor.name));
    setSelected(0);

    return true;
  }, [currentVendor]);

  /* MUTATE VENDOR COLORS */

  const onAddVendorColor = useCallback(async (color: string, groups: string[]) => {
    const colorData = {
      vendorName: currentVendor.name,
      color,
      groups,
      shopImageIds: {}
    };

    if (currentVendor.colors) {
      currentVendor.colors = [...currentVendor.colors, {...colorData}];
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
  }, [currentVendor]);

  const onUpdateVendorColor = useCallback(async (color: string, vendorColorUpdate: VendorColorUpdate) => {
    const vendorColor = currentVendor.colors?.find((vendorColor) => vendorColor.color === color);

    if (vendorColor) {
      vendorColor.color = vendorColorUpdate.color ?? vendorColor.color;
      vendorColor.groups = vendorColorUpdate.groups ?? vendorColor.groups;
      vendorColor.imageSrc = vendorColorUpdate.imageSrc ?? vendorColor.imageSrc;
      vendorColor.shopImageIds = vendorColorUpdate.shopImageIds ?? vendorColor.shopImageIds;
      vendorColor.altText = vendorColorUpdate.altText ?? vendorColor.altText
      vendorColor.fileName = vendorColorUpdate.fileName ?? vendorColor.fileName
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
  }, [currentVendor]);

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
  }, [currentVendor]);

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
  }, [currentVendor.colors])

  const bulkCreateVendorColors = useCallback(() => {
    const bulkVendorColors = Object.keys(UPLOAD_COLORS).flatMap((keyA) => {
      var vendorColorsJson = UPLOAD_COLORS[keyA as keyof typeof UPLOAD_COLORS];
      var vendorColorsData = JSON.parse(vendorColorsJson);

      return Object.keys(vendorColorsData).map((keyB) => {
        var vendorColorGroup = vendorColorsData[keyB];

        return ({
          vendorName: keyA,
          color: keyB,
          groups: [vendorColorGroup]
        });
      });
    });

    submit({
      actionType: Action.UploadVendorColorBulk,
      bulkVendorColors: JSON.stringify(bulkVendorColors)
    }, { method: "POST" });
  }, [UPLOAD_COLORS]);

  return (
    <Page title="Color Groups">
      <Card>
        <Tabs
          tabs={tabs}
          selected={selected}
          onSelect={setSelected}
          canCreateNewView
          onCreateNewView={onCreateVendor}
        >
          <BlockStack gap="400">
            <VendorColorForm onAddVendorColor={onAddVendorColor} />
            <Divider />
            <BlockStack gap="200">
              <Box>
                <Button
                  icon={PlusIcon}
                  variant="tertiary"
                  ariaControls="more-actions-collapsible"
                  onClick={() => setMoreActions((prev) => !prev)}
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
  )), [selectedGroups, onChangeSelectedGroups]);

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
  }, [selectedGroups, updateText]);

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

function VendorColorForm({ onAddVendorColor }: { onAddVendorColor: (color: string, groups: string[]) => void }) {
  const [color, setColor] = useState('');
  const [groups, setGroups] = useState<string[]>([]);

  const handleAddColorGroup = useCallback(() => {
    onAddVendorColor(color, groups);
    
    setColor('');
    setGroups([]);
  }, [color, groups]);

  const handleColorChange = useCallback((value: string) => setColor(value), []);

  const onChangeSelectedGroups = useCallback((values: string[]) => setGroups(values), []);

  return (
    <InlineGrid gap="400" columns={2}>
      <TextField
        value={color}
        onChange={handleColorChange}
        label="Color"
        type="text"
        autoComplete="off"
      />
      <MultiSelectGroups selectedGroups={groups} onChangeSelectedGroups={onChangeSelectedGroups} hideSelect={false} />
      <Box>
        <Button onClick={handleAddColorGroup} size="slim" disabled={!color || !groups.length}>Add Vendor Color</Button>
      </Box>
    </InlineGrid>
  );
}

function ColorGroupTable({currentVendor, onDeleteVendorColor, onUpdateVendorColor, submit}: {
  currentVendor: Vendor,
  onDeleteVendorColor: (color: string) => () => void,
  onUpdateVendorColor: (color: string, vendorColorUpdate: VendorColorUpdate) => Promise<void>,
  submit: SubmitFunction
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
  }, [editing, setEditing]);

  /* UPDATING VENDOR COLOR: IMAGE FUNCTIONALITY */

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
  }, [colorFiles]);

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
  }, [setColorFiles]);

  const rows = useMemo(() => {
    const selectedVendorColors = currentVendor.colors;

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

            <td style={{width: "100px"}} className="Polaris-IndexTable__TableCell">
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
            </td>
            
            <td style={{width: 0}} className="Polaris-IndexTable__TableCell">
              <InlineStack align="center">
                <Button icon={DeleteIcon} accessibilityLabel="Delete Color Group" onClick={onDeleteVendorColor(vendorColor.color)} />
              </InlineStack>
            </td>
          </IndexTable.Row>
      )});
    }
    else {
      return null;
    }
  }, [currentVendor.colors, colorFiles, editing]);

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
            {title: 'Edit', alignment: 'center'},
            {title: 'Remove', alignment: 'end'}
          ]}
      >
        {rows}
      </IndexTable>
    </Card>
  );
};
