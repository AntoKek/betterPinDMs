/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { addContextMenuPatch, findGroupChildrenByChildId, NavContextMenuPatchCallback, removeContextMenuPatch } from "@api/ContextMenu";
import { ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, openModal } from "@utils/modal";
import { extractAndLoadChunksLazy, findComponentByCodeLazy } from "@webpack";
import { Button, Forms, Menu, TextInput, Toasts, useState } from "@webpack/common";

import { addCategory, addChannelToCategory, categories, Category, isPinned, removeChannelFromCategory } from "./data";

interface ColorPickerProps {
    color: number | null;
    showEyeDropper?: boolean;
    onChange(value: number | null): void;
}

const ColorPicker = findComponentByCodeLazy<ColorPickerProps>(".BACKGROUND_PRIMARY).hex");

export const requireSettingsMenu = extractAndLoadChunksLazy(['name:"UserSettings"'], /createPromise:.{0,20}el\("(.+?)"\).{0,50}"UserSettings"/);

function NewCategoryModal({ modalProps, initalChannelId }: { modalProps: ModalProps; initalChannelId: string; }) {
    const [category, setCategory] = useState<Category>({
        id: Toasts.genId(),
        name: `Pin Category ${categories.length + 1}`,
        color: 0,
        channels: [initalChannelId]
    });

    return (
        <ModalRoot {...modalProps}>
            <ModalHeader>
                <Forms.FormTitle>New Category</Forms.FormTitle>
            </ModalHeader>

            <ModalContent>
                <Forms.FormTitle>Name</Forms.FormTitle>
                <TextInput
                    value={category.name}
                    onChange={e => setCategory({ ...category, name: e })}
                />

                <Forms.FormTitle>Color</Forms.FormTitle>
                <ColorPicker
                    key={category.name}
                    color={category.color}
                    onChange={c => setCategory({ ...category, color: c! })}
                />
            </ModalContent>

            <ModalFooter>
                <Button onClick={() => addCategory(category)} disabled={!category.name}>Create</Button>
            </ModalFooter>
        </ModalRoot>
    );
}

function PinMenuItem(channelId: string) {
    const pinned = isPinned(channelId);

    return (
        <Menu.MenuItem
            id="better-pin-dm"
            label="Pin DMs"
        >

            {!pinned && (
                <>
                    <Menu.MenuItem
                        id="add-category"
                        label="Add Category"
                        color="brand"
                        action={() => openModal(modalProps => <NewCategoryModal modalProps={modalProps} initalChannelId={channelId} />)}
                    />
                    <Menu.MenuSeparator />

                    {
                        categories.map(category => (
                            <Menu.MenuItem
                                id={`pin-category-${category.name}`}
                                label={category.name}
                                action={() => addChannelToCategory(channelId, category.id)}
                            />
                        ))
                    }
                </>
            )}

            {pinned && (
                <Menu.MenuItem
                    id="unpin-dm"
                    label="Unpin DM"
                    color="danger"
                    action={() => removeChannelFromCategory(channelId)}
                />
            )}

        </Menu.MenuItem>
    );
}

const GroupDMContext: NavContextMenuPatchCallback = (children, props) => () => {
    const container = findGroupChildrenByChildId("leave-channel", children);
    if (container)
        container.unshift(PinMenuItem(props.channel.id));
};

const UserContext: NavContextMenuPatchCallback = (children, props) => () => {
    const container = findGroupChildrenByChildId("close-dm", children);
    if (container) {
        const idx = container.findIndex(c => c?.props?.id === "close-dm");
        container.splice(idx, 0, PinMenuItem(props.channel.id));
    }
};

export function addContextMenus() {
    addContextMenuPatch("gdm-context", GroupDMContext);
    addContextMenuPatch("user-context", UserContext);
}

export function removeContextMenus() {
    removeContextMenuPatch("gdm-context", GroupDMContext);
    removeContextMenuPatch("user-context", UserContext);
}
