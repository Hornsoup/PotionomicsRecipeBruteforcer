import { Component, OnInit } from '@angular/core';
import { IngredientsService, Rarity } from './ingredients.service';
import { RecipeService, Senses } from './recipe.service';
import { MainLoopService } from './main-loop.service';
import { DataService } from './data.service';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.less']
})
export class AppComponent implements OnInit {

  title = 'PotionomicsBruteforcer';
  senses = Senses;
  qualitySelection: string[] = []
  recipeSort: string[] = []
  constructor(
    public mainLoopService: MainLoopService,
    public ingredientsService: IngredientsService,
    public recipeService: RecipeService,
    public dataService: DataService
  ) {
    this.qualitySelection = Object.keys(this.recipeService.qualities)
    this.recipeSort = Object.keys(this.recipeService.recipeSorts)
    this.recipeService.buildIngredients();
  }

  /** Startup */
  ngOnInit(): void {
    this.dataService.loadData();
    this.mainLoopService.start();
  }

  /** Changes the ingredient sorting */
  sortClick(mode: number){
    this.ingredientsService.changeSortMode(mode); 
    this.ingredientsService.ingredientSort();
  }

  /** Checks the sorting for arrow display */
  sortCheck(category: number, desc: boolean) {
    return this.ingredientsService.sortMode.category == category && this.ingredientsService.sortMode.descending == desc;
  }

  /** Sets the available to the amounts that Quinn will sell in a given day. */
  setToQuinns() {
    for (const ingredient of this.ingredientsService.ingredients) {
      ingredient.Avail = ingredient.Rarity == '9-Common' ? 10 : ingredient.Rarity == '4-Uncommon' ? 4 : ingredient.Rarity == '2-Rare' ? 2 : 1;
    }
    this.recipeService.updateFormula();
  }

  /** Changes all available to a specific number, generally for zeroing. */
  allAvailChange(event: Event) {
    if (!(event.target instanceof HTMLInputElement)) return;
    const numCheck = Math.max(Math.min(Number.isNaN(event.target.valueAsNumber) ? 0 : event.target.valueAsNumber, 999), 0);
    for (let i = 0; i < this.ingredientsService.ingredients.length; i++) {
      this.ingredientsService.ingredients[i].Avail = numCheck;
    }
    this.recipeService.updateFormula();
  }

  /** Updates a specific ingredient's available number. */
  ingredAvailChange(event: Event, index: number) {
    if (!(event.target instanceof HTMLInputElement)) return;
    const numCheck = Math.max(Math.min(Number.isNaN(event.target.valueAsNumber) ? 0 : event.target.valueAsNumber, 999), 0);
    this.ingredientsService.ingredients[index].Avail = numCheck;
    this.recipeService.updateFormula();
  }

  /** Updates a specific ingredient's available number. */
  mustHaveChange(event: Event, index: number) {
    if (!(event.target instanceof HTMLInputElement)) return;
    const numCheck = Math.max(Math.min(Number.isNaN(event.target.valueAsNumber) ? 0 : event.target.valueAsNumber, 14), 0);
    this.ingredientsService.ingredients[index].Avail = numCheck;
    this.recipeService.updateFormula();
  }

  /** Halves the current available number for entire inventory. */
  halveInventory() {
    for (let i = 0; i < this.ingredientsService.ingredients.length; i++) {
      this.ingredientsService.ingredients[i].Avail = Math.floor(this.ingredientsService.ingredients[i].Avail / 2);
    }
  }

  /** Removes available number of ingredients of a specific rarity. */
  selectRarityChange(str: Rarity) {
    for (let i = 0; i < this.ingredientsService.ingredients.length; i++) {
      if (this.ingredientsService.ingredients[i].Rarity == str)
        this.ingredientsService.ingredients[i].Avail = 0;
    }
  }

  /** Removes available number of ingredients not available on or after the specified week.  */
  selectWeekChange(week: number) {
    for (let i = 0; i < this.ingredientsService.ingredients.length; i++) {
      if (parseInt(this.ingredientsService.ingredients[i].Location[0]) >= week)
        this.ingredientsService.ingredients[i].Avail = 0;
    }
  }

  /** Checks for user changes to ingredient count. */
  ingredCountChange(event: Event) {
    if (!(event.target instanceof HTMLInputElement)) return;
    const numCheck = Math.max(Math.min(Number.isNaN(event.target.valueAsNumber) ? 2 : event.target.valueAsNumber, 14), 2);
    this.recipeService.ingredCount = numCheck;
    this.resetClick();
  }

  /** Checks for user changes to magamin target. */
  magaminChange(event: Event) {
    if (!(event.target instanceof HTMLInputElement)) return;
    const numCheck = Math.max(Math.min(Number.isNaN(event.target.valueAsNumber) ? 0 : event.target.valueAsNumber, 2000), 0);
    this.recipeService.maxMagamin = numCheck;
    this.resetClick();
  }

  /** Checks for user changes to shop bonuses. */
  bonusChange(event: Event) {
    if (!(event.target instanceof HTMLInputElement)) return;
    const numCheck = Math.max(Math.min(Number.isNaN(event.target.valueAsNumber) ? 0 : event.target.valueAsNumber, 10000), 0);
    this.recipeService.shopBonus = numCheck;
    this.recipeService.updateFormula();
  }

  /** Flips the filtration setting. */
  filterRecipe() {
    this.ingredientsService.filter = !this.ingredientsService.filter;
  }

  /** Sets the style for the matching ingredients by recipe depending on filter. */
  ingredCheck(i: number): string {
    let str = this.recipeService.ingredientList.find((a) => (a.index == i)) ? "GREEN" : "";
    str = this.ingredientsService.filter ? str.concat("INVISIBLE") : str;
    return str;
  }

  /** Sets desired traits to include in recipe. */
  setTrait(sense: number) {
    this.recipeService.traits[sense] = !this.recipeService.traits[sense];
    this.recipeService.updateFormula();
  }

  /** Sets desired illusions to include in recipe. */
  setIllusion(sense: number) {
    if (this.recipeService.illusion == sense) {
      this.recipeService.illusion = 0;
    } else {
      this.recipeService.illusion = sense;
      this.recipeService.traits[sense] = false;
    }
  }

  /** Flips the start/stop for the combination sim. */
  startClick() {
    this.mainLoopService.started = !this.mainLoopService.started;
    this.recipeService.recipeSort();
    this.recipeService.recipeDisplay();
  }

  /** Resets the combination sim. */
  resetClick() {
    this.recipeService.indexerInit();
    this.recipeService.searchInit();
  }

  
  /** Updates the formula in use. */
  formulaUpdate(event: Event) {
    if (!(event.target instanceof HTMLSelectElement)) return;
    this.recipeService.selectedFormula = parseInt(event.target.value);
    this.recipeService.updateFormula();
  }

  /** Updates the minimum allowed quality. */
  qualityUpdate(event: Event) {
    if (!(event.target instanceof HTMLSelectElement)) return;
    this.recipeService.selectedQuality = event.target.value;
    this.recipeService.updateFormula();
  }

  RecipeSortUpdate(event: Event) {
    if (!(event.target instanceof HTMLSelectElement)) return;
    this.recipeService.selectedSort = event.target.value;
    this.recipeService.recipeSort();
    this.recipeService.recipeDisplay();
  }

  /** Displays the profit ratio. */
  recipeRatio(i: number) {
    const recipe = this.recipeService.recipeListDisplay[i];
    return Math.floor((recipe.value * this.recipeService.potionCount() - recipe.cost) / recipe.cost * 100) / 100;
  }

  /* Abandoned the idea of people importing CSV updates, most users would just be confused.
    importCSVClick() {
      //this.ingredientsService.parseCSV();
    }
  
    exportCSVClick() {
      /*  const element = document.createElement('a');
        element.setAttribute('href', `data:text/plain;charset=utf-8,${this.title + "\n1,2,3,4,5\n6,7,8,9,0"}`);
        element.setAttribute('download', `PotionsList.csv`);
        const event = new MouseEvent("click");
        element.dispatchEvent(event);*//*
}*/
}
