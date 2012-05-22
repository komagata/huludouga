class CreateComments < ActiveRecord::Migration
  def change
    create_table :comments do |t|
      t.text :body
      t.integer :movie_id
      t.integer :position

      t.timestamps
    end
  end
end
