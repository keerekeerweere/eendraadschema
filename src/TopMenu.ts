export interface MenuItem {
    name: string;
    callback: () => void;
}

export class TopMenu {
    private ulElement: HTMLUListElement;
    private menuItems: MenuItem[];

    constructor(ulId: string, _liClassName: string, menuItems: MenuItem[]) {
        this.ulElement = document.getElementById(ulId) as HTMLUListElement;
        this.menuItems = menuItems;

        this.renderMenu();
        this.resetToFirstItem(); // Ensure the first item is selected initially
    }

    private renderMenu() {
        this.ulElement.innerHTML = ''; // Clear any existing content
        this.menuItems.forEach(item => {
            const liElement = document.createElement('li');
            const buttonElement = document.createElement('button');

            liElement.className = 'mx-1.5 inline';
            buttonElement.type = 'button';
            buttonElement.className = 'cursor-pointer border-0 border-b-4 border-transparent bg-transparent px-0 pb-1 font-semibold text-neutral-600 hover:border-orange-500 hover:text-neutral-800 focus-visible:rounded-sm focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-700/35';
            buttonElement.innerText = item.name;

            buttonElement.addEventListener('click', () => {
                this.selectItem(buttonElement);
                item.callback();
            });

            liElement.appendChild(buttonElement);
            this.ulElement.appendChild(liElement);
        });
    }

    private selectItem(selectedElement: HTMLButtonElement) {
        const items = this.ulElement.querySelectorAll('button');
        items.forEach(item => {
            item.removeAttribute('id');
            item.removeAttribute('aria-current');
            item.classList.remove('!border-orange-500', '!text-blue-700');
        });

        selectedElement.id = 'current';
        selectedElement.setAttribute('aria-current', 'page');
        selectedElement.classList.add('!border-orange-500', '!text-blue-700');
    }

    public resetToFirstItem() {
        const firstItem = this.ulElement.querySelector('button');
        if (firstItem) {
            this.selectItem(firstItem);
        }
    }

    public selectMenuItemByName(name: string) { 
        const item = this.menuItems.find(menuItem => menuItem.name === name); 
        if (item) { 
            const buttonElement = Array.from(this.ulElement.querySelectorAll('button')).find(button => button.innerText === name);
            if (buttonElement) {
                this.selectItem(buttonElement);
                item.callback(); 
            } 
        } 
    }

    public selectMenuItemByOrdinal(nr: number) {
        const items = this.ulElement.querySelectorAll('button');
        items.forEach(item => item.removeAttribute('id'));

        this.selectItem(items[nr]);
    }
    
}
